// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CrowdMintVault.sol"; // Importar o CrowdMintVault para usar seu enum
import "./CampaignFactory.sol"; // Importar CampaignFactory para chamar transferToVaultFromCampaign

contract Campaign is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable usdcToken;

    struct CampaignDetails {
        address creator;
        uint256 goal;
        uint256 deadline;
        uint256 amountRaised;
        bool goalBased;
        bool withdrawn;
        string metadataURI;
        bool active;
        uint256 minContribution; // NOVO: Contribuição mínima para esta campanha
    }

    CampaignDetails public details;
    address public immutable factory;
    address public immutable platformFeeCollector;
    address public immutable crowdMintVault;

    mapping(address => uint256) public donations;
    address[] public donors;

    uint256 public campaignEndedTimestamp;

    event Donated(address indexed donor, uint256 amount);
    event Withdrawn(address indexed creator, uint256 amount);
    event RefundRequested(address indexed donor, uint256 amount);
    event CampaignEnded(bool success);
    event FundsSentToVault(address indexed recipient, uint256 amount, string reason);

    uint256 private constant WITHDRAWAL_GRACE_PERIOD = 6 * 30 days;

    modifier campaignActive() {
        require(block.timestamp < details.deadline, "Campaign expired");
        require(details.active, "Campaign inactive");
        _;
    }

    modifier campaignExpired() {
        require(block.timestamp >= details.deadline, "Campaign not expired");
        _;
    }

    constructor(
        uint256 _goal,
        uint256 _deadline,
        bool _goalBased,
        string memory _metadataURI,
        address _creator,
        address _usdcToken,
        address _factory,
        address _feeCollector,
        address _crowdMintVault,
        uint256 _minContribution // NOVO: Parâmetro para contribuição mínima
    ) Ownable(_creator) {
        require(_deadline > block.timestamp, "Invalid deadline");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_creator != address(0), "Invalid creator");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_crowdMintVault != address(0), "Invalid CrowdMintVault address");

        usdcToken = IERC20(_usdcToken);
        factory = _factory;
        platformFeeCollector = _feeCollector;
        crowdMintVault = _crowdMintVault;

        details = CampaignDetails({
            creator: _creator,
            goal: _goal,
            deadline: _deadline,
            amountRaised: 0,
            goalBased: _goalBased,
            withdrawn: false,
            metadataURI: _metadataURI,
            active: true,
            minContribution: _minContribution // NOVO: Atribui o valor mínimo
        });
        campaignEndedTimestamp = 0;
    }

    function donate(uint256 _amount) external whenNotPaused campaignActive nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        // NOVO: Valida a contribuição mínima
        require(_amount >= details.minContribution, "Donation below minimum contribution");

        require(usdcToken.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");

        if (donations[msg.sender] == 0) {
            donors.push(msg.sender);
        }
        donations[msg.sender] += _amount;
        details.amountRaised += _amount;

        emit Donated(msg.sender, _amount);

        if (details.goalBased && details.amountRaised >= details.goal) {
            details.active = false;
            campaignEndedTimestamp = block.timestamp;
            emit CampaignEnded(true);
        }
    }

    function withdraw() external onlyOwner campaignExpired nonReentrant {
        require(!details.withdrawn, "Already withdrawn");
        uint256 amountToTransfer = 0;
        bool success = false;

        if (details.goalBased) {
            if (details.amountRaised >= details.goal) {
                amountToTransfer = details.amountRaised;
                success = true;
            }
        } else {
            amountToTransfer = details.amountRaised;
            success = true;
        }

        if (success && amountToTransfer > 0) {
            details.withdrawn = true;
            if (block.timestamp >= details.deadline + WITHDRAWAL_GRACE_PERIOD) {
                require(usdcToken.transfer(factory, amountToTransfer), "Transfer to factory for vault failed");
                CampaignFactory(factory).transferToVaultFromCampaign(
                    address(this),
                    amountToTransfer,
                    CrowdMintVault.DepositType.CampaignFunds,
                    details.creator
                );
                emit FundsSentToVault(crowdMintVault, amountToTransfer, "Campaign funds not withdrawn in time");
            } else {
                require(usdcToken.transfer(details.creator, amountToTransfer), "Withdraw failed");
                emit Withdrawn(details.creator, amountToTransfer);
            }
        } else {
            if (campaignEndedTimestamp == 0) {
                campaignEndedTimestamp = block.timestamp;
            }
        }
    }

    function requestRefund() external campaignExpired nonReentrant {
        require(details.goalBased, "Not a goal-based campaign");
        require(details.amountRaised < details.goal, "Goal was met");
        require(donations[msg.sender] > 0, "No donation found");

        uint256 amount = donations[msg.sender];
        donations[msg.sender] = 0;
        details.amountRaised -= amount;

        if (block.timestamp >= details.deadline + WITHDRAWAL_GRACE_PERIOD) {
            require(usdcToken.transfer(factory, amount), "Transfer to factory for vault failed");
            CampaignFactory(factory).transferToVaultFromCampaign(
                address(this),
                amount,
                CrowdMintVault.DepositType.RefundFunds,
                msg.sender
            );
            emit FundsSentToVault(crowdMintVault, amount, "Refund funds not claimed in time");
        } else {
            require(usdcToken.transfer(msg.sender, amount), "Refund failed");
            emit RefundRequested(msg.sender, amount);
        }
    }

    function endCampaign() external onlyOwner campaignExpired {
        if (campaignEndedTimestamp == 0) {
            campaignEndedTimestamp = block.timestamp;
            emit CampaignEnded(false);
        }
    }

    function getProgress() external view returns (uint256 raised, uint256 goal, uint256 percentage) {
        raised = details.amountRaised;
        goal = details.goal;
        if (details.goal == 0) {
            percentage = 0;
        } else {
            if (details.amountRaised >= type(uint256).max / 100) {
                percentage = 100;
            } else {
                percentage = (details.amountRaised * 100) / details.goal;
            }
        }
    }

    function getDonors() external view returns (address[] memory) {
        return donors;
    }

    function getDonorContribution(address _donor) external view returns (uint256) {
        return donations[_donor];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}

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
        uint256 minContribution;
    }

    CampaignDetails public details;
    address public immutable factory;
    address public immutable platformFeeCollector;
    address public immutable crowdMintVault;

    mapping(address => uint256) public donations;
    address[] public donors; // Array para listar todos os doadores

    uint256 public campaignEndedTimestamp;

    event Donated(address indexed donor, uint256 amount);
    event Withdrawn(address indexed creator, uint256 amount);
    event RefundRequested(address indexed donor, uint256 amount);
    event CampaignEnded(bool success);
    event FundsSentToVault(address indexed recipient, uint256 amount, string reason);
    event UnclaimedFundsSwept(address indexed originalClaimer, uint256 amount, CrowdMintVault.DepositType depositType);
    event PlatformWithdrawalFeeCollected(address indexed collector, uint256 amount); // Novo evento para a taxa de saque

    uint256 private constant WITHDRAWAL_GRACE_PERIOD = 6 * 30 days; // 6 meses

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
        uint256 _minContribution
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
            minContribution: _minContribution
        });

        campaignEndedTimestamp = 0;

        // Aprovação ilimitada para o Factory puxar fundos quando necessário (unclaimed pipeline)
        require(usdcToken.approve(_factory, type(uint256).max), "Approve to factory failed");
    }

    function donate(uint256 _amount) external whenNotPaused campaignActive nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
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
                // Fundos não reclamados, varridos para o Vault
                CampaignFactory(factory).transferToVaultFromCampaign(
                    address(this),
                    amountToTransfer,
                    CrowdMintVault.DepositType.CampaignFunds,
                    details.creator
                );
                emit FundsSentToVault(crowdMintVault, amountToTransfer, "Campaign funds not withdrawn in time");
            } else {
                // Saque normal pelo criador dentro do período de carência
                // Implementação da taxa de 0.5%
                uint256 platformWithdrawalFee = (amountToTransfer * 50) / 10000; // 0.5%
                uint256 netAmountToCreator = amountToTransfer - platformWithdrawalFee;

                // Transferir a taxa para o coletor de taxas da plataforma
                require(usdcToken.transfer(platformFeeCollector, platformWithdrawalFee), "Platform withdrawal fee transfer failed");
                emit PlatformWithdrawalFeeCollected(platformFeeCollector, platformWithdrawalFee);

                // Transferir o valor líquido para o criador
                require(usdcToken.transfer(details.creator, netAmountToCreator), "Withdraw failed");
                emit Withdrawn(details.creator, netAmountToCreator);
            }
        } else {
            if (campaignEndedTimestamp == 0) {
                campaignEndedTimestamp = block.timestamp;
            }
            // Emit CampaignEnded(false) se o goalBased não atingiu a meta e não há fundos para sacar
            if (details.goalBased && details.amountRaised < details.goal) {
                emit CampaignEnded(false);
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
            // Fundos não reclamados, varridos para o Vault
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

    /**
     * @notice Permite que qualquer pessoa acione o envio de fundos não reclamados para o Vault
     *         após o período de carência, para o criador ou para um doador específico.
     * @dev Esta função é permissionless para garantir que os fundos sejam movidos automaticamente.
     *      Ela verifica se o período de carência expirou e se os fundos ainda não foram reclamados.
     * @param _originalClaimer O endereço do criador ou do doador cujos fundos serão varridos.
     * @param _depositType O tipo de depósito (CampaignFunds ou RefundFunds).
     */
    function sweepUnclaimedFunds(address _originalClaimer, CrowdMintVault.DepositType _depositType) external nonReentrant {
        require(block.timestamp >= details.deadline + WITHDRAWAL_GRACE_PERIOD, "Grace period not over yet");
        uint256 amountToSweep = 0;

        if (_depositType == CrowdMintVault.DepositType.CampaignFunds) {
            require(_originalClaimer == details.creator, "Invalid claimer for campaign funds");
            require(!details.withdrawn, "Campaign funds already withdrawn"); // Verifica se já foi sacado/varrido

            // Verifica se a campanha é elegível para saque (meta batida ou flexível)
            bool eligibleForWithdrawal = false;
            if (details.goalBased) {
                if (details.amountRaised >= details.goal) {
                    eligibleForWithdrawal = true;
                }
            } else {
                eligibleForWithdrawal = true;
            }
            require(eligibleForWithdrawal, "Campaign funds not eligible for sweep (goal not met for goal-based)");

            amountToSweep = details.amountRaised;
            details.withdrawn = true; // Marca como varrido para evitar duplicação
        } else if (_depositType == CrowdMintVault.DepositType.RefundFunds) {
            require(details.goalBased, "Not a goal-based campaign for refund sweep");
            require(details.amountRaised < details.goal, "Goal was met, no refunds due");
            require(donations[_originalClaimer] > 0, "No unclaimed donation for this donor");

            amountToSweep = donations[_originalClaimer];
            donations[_originalClaimer] = 0; // Zera a doação do doador
            details.amountRaised -= amountToSweep; // Ajusta o total arrecadado
        } else {
            revert("Invalid deposit type for sweep");
        }

        require(amountToSweep > 0, "No funds to sweep");

        CampaignFactory(factory).transferToVaultFromCampaign(
            address(this),
            amountToSweep,
            _depositType,
            _originalClaimer
        );
        emit UnclaimedFundsSwept(_originalClaimer, amountToSweep, _depositType);
    }

    function endCampaign() external onlyOwner campaignExpired {
        if (campaignEndedTimestamp == 0) {
            campaignEndedTimestamp = block.timestamp;
            details.active = false; // NOVO: Define a campanha como inativa
            if (details.goalBased && details.amountRaised < details.goal) {
                emit CampaignEnded(false);
            } else if (!details.goalBased || details.amountRaised >= details.goal) {
                emit CampaignEnded(true);
            }
        }
    }

    function getProgress() external view returns (uint256 raised, uint256 goal, uint256 percentage) {
        raised = details.amountRaised;
        goal = details.goal;
        if (details.goal == 0) {
            // Para campanhas flexíveis sem meta numérica, a porcentagem pode ser 100% ou 0%
            // dependendo da representação desejada. Se for uma campanha flexível,
            // geralmente se considera que ela "atingiu" seu objetivo de ser flexível.
            // Para manter a consistência com o cálculo de porcentagem, 0 é uma opção segura.
            percentage = 0;
        } else {
            if (details.amountRaised >= details.goal) {
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

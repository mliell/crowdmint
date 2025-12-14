// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Campaign.sol";
import "./CrowdMintVault.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CampaignFactory is Ownable, Pausable, ReentrancyGuard {
    address public immutable USDC_TOKEN;
    address public platformFeeCollector;
    address public immutable crowdMintVault;

    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 goal,
        uint256 deadline,
        bool goalBased,
        string metadataURI,
        uint256 minContribution // NOVO: Adicionado ao evento
    );
    event UnclaimedFundsVaultUpdated(address indexed oldVault, address indexed newVault);
    event FundsTransferredToVault(address indexed campaign, address indexed vault, uint256 amount, string reason);

    address[] public campaigns;
    mapping(address => bool) public isValidCampaign;
    uint256 public campaignCount;

    constructor(address _usdcToken, address _feeCollector, address _crowdMintVault) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_feeCollector != address(0), "Invalid fee collector");
        require(_crowdMintVault != address(0), "Invalid CrowdMintVault address");
        USDC_TOKEN = _usdcToken;
        platformFeeCollector = _feeCollector;
        crowdMintVault = _crowdMintVault;
    }

    /**
     * @notice Cria uma nova campanha de crowdfunding
     * @param _goal Meta em USDC (ex: 1000 = 1000 USDC)
     * @param _deadline Timestamp Unix do prazo final
     * @param _goalBased true = all-or-nothing, false = flexível
     * @param _metadataURI URI dos metadados da campanha
     * @param _minContribution Contribuição mínima em USDC (0 para opcional/sem mínimo)
     * @return address Endereço do contrato da campanha criada
     */
    function createCampaign(
        uint256 _goal,
        uint256 _deadline,
        bool _goalBased,
        string memory _metadataURI,
        uint256 _minContribution // NOVO: Parâmetro para contribuição mínima
    ) external whenNotPaused returns (address) {
        require(_goal > 0, "Goal must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_deadline <= block.timestamp + 365 days, "Deadline too far (max 1 year)");
        require(bytes(_metadataURI).length > 0, "Metadata URI required");
        // Não há require para _minContribution > 0 aqui, pois é opcional.
        // Se for 0, significa que não há mínimo (ou o mínimo é 1 wei, dependendo da interpretação do front-end).

        uint256 goalInWei = _goal; // Assumindo que _goal já está na menor unidade (e.g., 1e6 para USDC com 6 decimais)

        Campaign newCampaign = new Campaign(
            goalInWei,
            _deadline,
            _goalBased,
            _metadataURI,
            msg.sender,
            USDC_TOKEN,
            address(this),
            platformFeeCollector,
            crowdMintVault,
            _minContribution // NOVO: Passa o valor mínimo para o construtor da campanha
        );

        campaigns.push(address(newCampaign));
        isValidCampaign[address(newCampaign)] = true;
        campaignCount++;

        emit CampaignCreated(
            address(newCampaign),
            msg.sender,
            _goal,
            _deadline,
            _goalBased,
            _metadataURI,
            _minContribution // NOVO: Emite o valor mínimo no evento
        );
        return address(newCampaign);
    }

    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        platformFeeCollector = _newCollector;
    }

    function transferToVaultFromCampaign(
        address _campaignAddress,
        uint256 _amount,
        CrowdMintVault.DepositType _depositType,
        address _originalClaimer
    ) external whenNotPaused nonReentrant {
        require(isValidCampaign[msg.sender], "Only valid campaigns can transfer funds to vault via factory");
        require(_campaignAddress == msg.sender, "Campaign address mismatch");
        require(_amount > 0, "Amount must be greater than 0");

        require(IERC20(USDC_TOKEN).transferFrom(_campaignAddress, address(this), _amount), "Factory: USDC transfer from campaign failed");

        if (_depositType == CrowdMintVault.DepositType.CampaignFunds) {
            CrowdMintVault(crowdMintVault).depositCampaignFunds(_originalClaimer, _amount);
        } else if (_depositType == CrowdMintVault.DepositType.RefundFunds) {
            CrowdMintVault(crowdMintVault).depositRefundFunds(_originalClaimer, _amount);
        } else {
            revert("Invalid deposit type");
        }
        emit FundsTransferredToVault(_campaignAddress, crowdMintVault, _amount, "Funds moved to vault");
    }

    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    function getCampaign(uint256 _index) external view returns (address) {
        require(_index < campaigns.length, "Invalid index");
        return campaigns[_index];
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function totalCampaigns() external view returns (uint256) {
        return campaignCount;
    }
}

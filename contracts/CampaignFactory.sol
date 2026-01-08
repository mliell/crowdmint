// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./Campaign.sol"; // Importado para criar novas campanhas e para o cast em registerExistingCampaigns
import "./CrowdMintVault.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CampaignFactory is Ownable, Pausable, ReentrancyGuard {
    address public immutable USDC_TOKEN;
    address public platformFeeCollector; // Removido 'immutable' para permitir setFeeCollector
    address public immutable crowdMintVault;

    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        uint256 goal,
        uint256 deadline,
        bool goalBased,
        string metadataURI,
        uint256 minContribution
    );
    event UnclaimedFundsVaultUpdated(address indexed oldVault, address indexed newVault);
    event FundsTransferredToVault(address indexed campaign, address indexed vault, uint256 amount, string reason);
    event PlatformFeeCollectorUpdated(address indexed oldCollector, address indexed newCollector);
    event CampaignRegistered(address indexed campaignAddress, address indexed creator); // NOVO: Evento para campanhas registradas

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
        // campaignRegistry = _campaignRegistry; // Descomente se você decidir usar um CampaignRegistry universal
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
        uint256 _minContribution
    ) external whenNotPaused returns (address) {
        require(_goal > 0, "Goal must be greater than 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_deadline <= block.timestamp + 365 days, "Deadline too far (max 1 year)");
        require(bytes(_metadataURI).length > 0, "Metadata URI required");

        uint256 goalInWei = _goal;
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
            _minContribution
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
            _minContribution
        );
        return address(newCampaign);
    }

    /**
     * @notice Permite ao owner atualizar o endereço do coletor de taxas da plataforma.
     * @dev Isso afetará apenas as campanhas criadas APÓS esta atualização.
     *      Campanhas existentes manterão o platformFeeCollector com o qual foram criadas.
     * @param _newCollector O novo endereço para o coletor de taxas da plataforma.
     */
    function setFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Invalid address");
        address oldCollector = platformFeeCollector;
        platformFeeCollector = _newCollector;
        emit PlatformFeeCollectorUpdated(oldCollector, _newCollector);
    }

    /**
     * @notice Puxa fundos de uma campanha e os deposita diretamente no CrowdMintVault.
     * @dev Apenas campanhas válidas podem chamar esta função.
     *      O Factory atua como intermediário para puxar os fundos da campanha (que aprovou o Factory)
     *      e enviá-los diretamente para o Vault, garantindo atomicidade.
     * @param _campaignAddress O endereço do contrato da campanha.
     * @param _amount O valor a ser transferido.
     * @param _depositType O tipo de depósito (CampaignFunds ou RefundFunds).
     * @param _originalClaimer O endereço do criador da campanha ou do doador original.
     */
    function transferToVaultFromCampaign(
        address _campaignAddress,
        uint256 _amount,
        CrowdMintVault.DepositType _depositType,
        address _originalClaimer
    ) external whenNotPaused nonReentrant {
        require(isValidCampaign[msg.sender], "Only valid campaigns can transfer funds to vault via factory");
        require(_campaignAddress == msg.sender, "Campaign address mismatch");
        require(_amount > 0, "Amount must be greater than 0");

        require(
            IERC20(USDC_TOKEN).transferFrom(_campaignAddress, crowdMintVault, _amount),
            "Factory: USDC transfer from campaign to vault failed"
        );

        if (_depositType == CrowdMintVault.DepositType.CampaignFunds) {
            CrowdMintVault(crowdMintVault).depositCampaignFunds(_originalClaimer, _amount);
        } else if (_depositType == CrowdMintVault.DepositType.RefundFunds) {
            CrowdMintVault(crowdMintVault).depositRefundFunds(_originalClaimer, _amount);
        } else {
            revert("Invalid deposit type");
        }

        emit FundsTransferredToVault(_campaignAddress, crowdMintVault, _amount, "Funds moved to vault");
    }

    /**
     * @notice Permite ao owner registrar contratos de campanha existentes.
     * @dev Esta função é destinada a cenários de migração ao atualizar o CampaignFactory.
     *      Ela adiciona endereços de campanhas pré-existentes às listas de rastreamento do factory.
     *      Apenas o owner pode chamar esta função.
     * @param _campaignAddresses Um array de endereços de contratos de campanha já implantados.
     */
    function registerExistingCampaigns(address[] calldata _campaignAddresses) external onlyOwner {
        require(_campaignAddresses.length > 0, "No campaign addresses provided");

        for (uint256 i = 0; i < _campaignAddresses.length; i++) {
            address campaignAddr = _campaignAddresses[i];
            require(campaignAddr != address(0), "Invalid campaign address at index");
            require(!isValidCampaign[campaignAddr], "Campaign already registered");

            // Opcional: Adicione uma verificação para garantir que é um contrato Campaign válido.
            // Isso pode aumentar o custo de gás no loop, mas melhora a segurança.
            // Por exemplo, chame uma função de view que só existe em Campaign.
            // Se a campanha não tiver um owner(), você pode usar outra função.
            // Ex: Campaign(campaignAddr).usdcToken(); // Reverterá se não for um Campaign
            // Ou, para ser mais leve, confie que os endereços fornecidos são válidos.

            campaigns.push(campaignAddr);
            isValidCampaign[campaignAddr] = true;
            campaignCount++;

            // Emite um evento para cada campanha registrada
            // Assumindo que Campaign(campaignAddr).owner() é acessível e retorna o criador
            emit CampaignRegistered(campaignAddr, Campaign(campaignAddr).owner());
        }
    }

    function getCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    function getCampaign(uint256 _index) external view returns (address) {
        require(_index < campaigns.length, "Invalid index");
        return campaigns[_index];
    }

    /**
     * @notice Retorna o número total de campanhas rastreadas por este factory.
     * @dev Inclui campanhas criadas e campanhas registradas manualmente.
     */
    function getCampaignsLength() external view returns (uint256) {
        return campaigns.length;
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

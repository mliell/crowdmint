// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrowdMintVault
 * @dev Contrato para gerenciar fundos não sacados de campanhas e reembolsos.
 *      Permite o rastreamento de principal, aplicação de taxa no saque e acumulação de rendimentos.
 *      A gestão de rendimentos e distribuição é externa ao contrato.
 */
contract CrowdMintVault is Ownable, Pausable, ReentrancyGuard {
    IERC20 public immutable usdcToken;
    address public campaignFactory; // Agora mutável para permitir definição após o deploy
    address public immutable platformFeeCollector;

    // Estrutura para rastrear cada depósito no vault
    struct VaultDeposit {
        uint256 principalAmount; // Valor original depositado (principal)
        uint256 depositTimestamp; // Timestamp do depósito
        address originalClaimer; // Endereço do criador da campanha ou do doador original
        DepositType depositType; // Tipo de depósito (CampaignFunds ou RefundFunds)
        bool claimedByOriginalClaimer; // Indica se o valor principal já foi sacado pelo reclamante original
        bool principalIncorporated; // Indica se o principal foi incorporado permanentemente ao Vault
    }

    enum DepositType {
        CampaignFunds,
        RefundFunds
    }

    // Mapeamento de um ID único para cada depósito
    mapping(uint256 => VaultDeposit) public vaultDeposits;
    uint256 public nextDepositId; // Contador para gerar IDs únicos de depósito

    // Totalizadores
    uint256 public totalPrincipalAvailableForClaim; // Principal que ainda pode ser reclamado pelos originais
    uint256 public totalPrincipalIncorporated; // Principal incorporado permanentemente ao Vault
    uint256 public totalVaultFeesCollected; // Taxas de 8% cobradas nos saques (parte do vault)
    uint256 public totalPlatformFeesFromVaultClaims; // Novidade: Taxas de 2% cobradas nos saques (parte da plataforma)
    uint256 public totalYieldAccumulated; // Rendimento total acumulado no Vault (registrado manualmente)

    // Eventos para rastreabilidade
    event FundsDeposited(
        uint256 indexed depositId,
        address indexed originalClaimer,
        DepositType indexed depositType,
        uint256 amount,
        uint256 depositTimestamp
    );
    event PrincipalClaimedByOriginalClaimer(
        uint256 indexed depositId,
        address indexed originalClaimer,
        uint256 claimedAmount,
        uint256 vaultFeePaid,
        uint256 platformFeePaid
    ); // Adicionado platformFeePaid
    event PrincipalIncorporated(uint256 indexed depositId, uint256 amount);
    event YieldRecorded(uint256 amount); // Evento para registrar o rendimento
    event VaultFundsWithdrawn(address indexed recipient, uint256 amount); // Saque geral do vault pelo owner

    // Duração do Vault Lock para a taxa de 10% e incorporação do principal (3 anos)
    uint256 public constant VAULT_LOCK_PERIOD = 3 * 365 days; // 3 anos em segundos (aproximadamente)

    // Taxas do vault (10% total)
    uint256 public constant TOTAL_CLAIM_FEE_PERCENTAGE = 1000; // Representa 10% (1000 / 10000)
    uint256 public constant VAULT_SHARE_PERCENTAGE = 800; // 8% para o vault (800 / 10000)
    uint256 public constant PLATFORM_SHARE_PERCENTAGE = 200; // 2% para a plataforma (200 / 10000)

    constructor(
        address _usdcToken,
        address _platformFeeCollector
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_platformFeeCollector != address(0), "Invalid platform fee collector address");
        usdcToken = IERC20(_usdcToken);
        platformFeeCollector = _platformFeeCollector;
        nextDepositId = 1;
    }

    /**
     * @notice Define o endereço do CampaignFactory.
     * @dev Apenas o owner pode chamar esta função. Deve ser chamado uma vez após o deploy do Factory.
     * @param _newFactory O endereço do CampaignFactory.
     */
    function setCampaignFactory(address _newFactory) external onlyOwner {
        require(_newFactory != address(0), "Invalid address");
        require(campaignFactory == address(0), "CampaignFactory already set"); // Permite definir apenas uma vez
        campaignFactory = _newFactory;
    }

    /**
     * @notice Recebe fundos de uma campanha não sacados.
     * @dev Apenas o contrato CampaignFactory pode chamar esta função.
     * @param _originalClaimer Endereço do criador da campanha.
     * @param _amount Valor a ser depositado.
     */
    function depositCampaignFunds(address _originalClaimer, uint256 _amount)
        external
        whenNotPaused
        nonReentrant
    {
        require(msg.sender == campaignFactory, "Only CampaignFactory can deposit campaign funds");
        require(_amount > 0, "Amount must be greater than 0");

        // O Factory já transferiu os fundos para o Vault antes de chamar esta função.
        // Não precisamos de transferFrom aqui, apenas registrar o depósito.
        // require(usdcToken.transferFrom(campaignFactory, address(this), _amount), "USDC transfer failed"); // Removido

        uint256 currentDepositId = nextDepositId++;
        vaultDeposits[currentDepositId] = VaultDeposit({
            principalAmount: _amount,
            depositTimestamp: block.timestamp,
            originalClaimer: _originalClaimer,
            depositType: DepositType.CampaignFunds,
            claimedByOriginalClaimer: false,
            principalIncorporated: false
        });

        totalPrincipalAvailableForClaim += _amount;
        emit FundsDeposited(currentDepositId, _originalClaimer, DepositType.CampaignFunds, _amount, block.timestamp);
    }

    /**
     * @notice Recebe fundos de reembolsos não sacados.
     * @dev Apenas o contrato CampaignFactory pode chamar esta função.
     * @param _originalClaimer Endereço do doador original.
     * @param _amount Valor a ser depositado.
     */
    function depositRefundFunds(address _originalClaimer, uint256 _amount)
        external
        whenNotPaused
        nonReentrant
    {
        require(msg.sender == campaignFactory, "Only CampaignFactory can deposit refund funds");
        require(_amount > 0, "Amount must be greater than 0");

        // O Factory já transferiu os fundos para o Vault antes de chamar esta função.
        // Não precisamos de transferFrom aqui, apenas registrar o depósito.
        // require(usdcToken.transferFrom(campaignFactory, address(this), _amount), "USDC transfer failed"); // Removido

        uint256 currentDepositId = nextDepositId++;
        vaultDeposits[currentDepositId] = VaultDeposit({
            principalAmount: _amount,
            depositTimestamp: block.timestamp,
            originalClaimer: _originalClaimer,
            depositType: DepositType.RefundFunds,
            claimedByOriginalClaimer: false,
            principalIncorporated: false
        });

        totalPrincipalAvailableForClaim += _amount;
        emit FundsDeposited(currentDepositId, _originalClaimer, DepositType.RefundFunds, _amount, block.timestamp);
    }

    /**
     * @notice Permite ao reclamante original (criador ou doador) sacar o principal.
     * @dev Só pode ser chamado pelo originalClaimer e dentro do VAULT_LOCK_PERIOD.
     *      Uma taxa de 10% é cobrada: 2% para a plataforma e 8% para o vault.
     * @param _depositId ID do depósito no vault.
     */
    function claimPrincipalByOriginalClaimer(uint256 _depositId) external nonReentrant {
        VaultDeposit storage deposit = vaultDeposits[_depositId];
        require(deposit.principalAmount > 0, "Invalid deposit ID");
        require(msg.sender == deposit.originalClaimer, "Only original claimer can claim");
        require(!deposit.claimedByOriginalClaimer, "Principal already claimed by original claimer");
        require(!deposit.principalIncorporated, "Principal already incorporated into Vault");
        require(block.timestamp < deposit.depositTimestamp + VAULT_LOCK_PERIOD, "Vault lock period has expired");

        uint256 originalAmount = deposit.principalAmount;

        // Calcular as taxas
        uint256 platformFee = (originalAmount * PLATFORM_SHARE_PERCENTAGE) / 10000; // 2%
        uint256 vaultFee = (originalAmount * VAULT_SHARE_PERCENTAGE) / 10000; // 8%
        uint256 amountToTransfer = originalAmount - (platformFee + vaultFee); // 90% para o reclamante

        deposit.claimedByOriginalClaimer = true;
        totalPrincipalAvailableForClaim -= originalAmount;
        totalVaultFeesCollected += vaultFee; // 8% fica no vault e é rastreado aqui
        totalPlatformFeesFromVaultClaims += platformFee; // 2% vai para o coletor da plataforma

        // Transferir a taxa de 2% para o coletor de taxas da plataforma
        require(usdcToken.transfer(platformFeeCollector, platformFee), "Platform fee transfer failed from vault claim");

        // Transferir o valor líquido (90%) para o reclamante original
        require(usdcToken.transfer(deposit.originalClaimer, amountToTransfer), "Principal claim failed");

        emit PrincipalClaimedByOriginalClaimer(_depositId, deposit.originalClaimer, amountToTransfer, vaultFee, platformFee);
    }

    /**
     * @notice Incorpora o principal de um depósito ao Vault após o período de VAULT_LOCK_PERIOD.
     * @dev Pode ser chamado por qualquer um para "ativar" a incorporação.
     * @param _depositId ID do depósito no vault.
     */
    function incorporatePrincipal(uint256 _depositId) external nonReentrant {
        VaultDeposit storage deposit = vaultDeposits[_depositId];
        require(deposit.principalAmount > 0, "Invalid deposit ID");
        require(!deposit.principalIncorporated, "Principal already incorporated");
        require(!deposit.claimedByOriginalClaimer, "Principal already claimed by original claimer");
        require(block.timestamp >= deposit.depositTimestamp + VAULT_LOCK_PERIOD, "Vault lock period not over yet");

        deposit.principalIncorporated = true;
        totalPrincipalAvailableForClaim -= deposit.principalAmount;
        totalPrincipalIncorporated += deposit.principalAmount;
        emit PrincipalIncorporated(_depositId, deposit.principalAmount);
    }

    /**
     * @notice Permite ao owner registrar o rendimento total acumulado no Vault.
     * @dev Este rendimento vem de interações externas (ex: protocolos DeFi).
     *      O valor é adicionado ao saldo total de rendimentos acumulados.
     * @param _yieldAmount Valor do rendimento gerado.
     */
    function recordTotalYield(uint256 _yieldAmount) external onlyOwner {
        require(_yieldAmount > 0, "Yield amount must be greater than 0");
        totalYieldAccumulated += _yieldAmount;
        emit YieldRecorded(_yieldAmount);
    }

    /**
     * @notice Permite ao proprietário do vault (owner) sacar qualquer saldo.
     * @dev Esta função é para o owner gerenciar os fundos do vault, incluindo
     *      o principal incorporado, rendimentos acumulados e taxas coletadas.
     *      Deve ser usada com cautela e responsabilidade.
     * @param _amount Valor a ser sacado.
     */
    function withdrawVaultFunds(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(usdcToken.balanceOf(address(this)) >= _amount, "Insufficient balance in vault");
        require(usdcToken.transfer(owner(), _amount), "Withdrawal failed");
        emit VaultFundsWithdrawn(owner(), _amount);
    }

    // --- Funções de consulta de valores totais ---
    /**
     * @notice Retorna o principal total que ainda pode ser reclamado pelos usuários originais.
     */
    function getTotalPrincipalAvailableForClaim() external view returns (uint256) {
        return totalPrincipalAvailableForClaim;
    }

    /**
     * @notice Retorna o principal total que foi permanentemente incorporado ao Vault.
     */
    function getTotalPrincipalIncorporated() external view returns (uint256) {
        return totalPrincipalIncorporated;
    }

    /**
     * @notice Retorna o total de taxas de 8% coletadas pelo Vault.
     */
    function getTotalVaultFeesCollected() external view returns (uint256) {
        return totalVaultFeesCollected;
    }

    /**
     * @notice Retorna o total de taxas de 2% coletadas para a plataforma a partir de claims do vault.
     */
    function getTotalPlatformFeesFromVaultClaims() external view returns (uint256) {
        return totalPlatformFeesFromVaultClaims;
    }

    /**
     * @notice Retorna o rendimento total acumulado no Vault.
     */
    function getTotalYieldAccumulated() external view returns (uint256) {
        return totalYieldAccumulated;
    }

    // --- Funções de visualização de depósitos individuais ---
    function getDepositDetails(uint256 _depositId)
        external
        view
        returns (
            uint256 principalAmount,
            uint256 depositTimestamp,
            address originalClaimer,
            DepositType depositType,
            bool claimedByOriginalClaimer,
            bool principalIncorporated
        )
    {
        VaultDeposit storage deposit = vaultDeposits[_depositId];
        return (
            deposit.principalAmount,
            deposit.depositTimestamp,
            deposit.originalClaimer,
            deposit.depositType,
            deposit.claimedByOriginalClaimer,
            deposit.principalIncorporated
        );
    }

    function getVaultBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    // --- Funções de Pausable ---
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}

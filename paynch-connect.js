import { WalletConnectModalSign } from "./bundle.js";


const getSiteMetadata = () => {
  // Tenta pegar do meta tags
  const siteName = document.querySelector('meta[property="og:site_name"]')?.content ||
                   document.querySelector('meta[name="application-name"]')?.content ||
                   document.title ||
                   window.location.hostname;
  
  const siteDescription = document.querySelector('meta[name="description"]')?.content ||
                         document.querySelector('meta[property="og:description"]')?.content ||
                         `Pagamento seguro em ${window.location.hostname}`;
  
  const siteIcon = document.querySelector('meta[property="og:image"]')?.content ||
                   document.querySelector('link[rel="icon"]')?.href ||
                   document.querySelector('link[rel="apple-touch-icon"]')?.href ||
                   `${window.location.origin}/favicon.ico`;

  return {
    name: siteName,
    description: siteDescription,
    url: window.location.origin,
    icons: [siteIcon]
  };
};

const web3Modal = new WalletConnectModalSign({
  projectId: "258d0f8b5df6e8eaa632a66a45c35190",
  metadata: getSiteMetadata(),
  disableInjectedProvider: false,
});

var contract;
let provider;
let web3;
let wallet;
let session;
let connected = false;
var txHash = "";
var txStatus = null;


const ERC20_ABI = [
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}
];


let PAYMENT_TOKEN_ADDR = null;
let PAYMENT_TOKEN_SYMBOL = "TOKEN";
let PAYMENT_TOKEN_DECIMALS = 18;

const SHOP_ABI = [{"inputs":[{"internalType":"address","name":"_paymentToken","type":"address"},{"internalType":"address","name":"_cashbackToken","type":"address"},{"internalType":"address","name":"_receiver","type":"address"},{"internalType":"bool","name":"_isPremium","type":"bool"},{"internalType":"address","name":"_systemOwnerWallet","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ArrayLengthMismatch","type":"error"},{"inputs":[],"name":"CashbackNotEnabled","type":"error"},{"inputs":[],"name":"InsufficientAllowance","type":"error"},{"inputs":[],"name":"InsufficientCashbackBalance","type":"error"},{"inputs":[],"name":"InvalidAddress","type":"error"},{"inputs":[],"name":"InvalidAmount","type":"error"},{"inputs":[],"name":"InvalidPercentage","type":"error"},{"inputs":[],"name":"InvalidToken","type":"error"},{"inputs":[],"name":"TransferFailed","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"percentageBps","type":"uint256"},{"indexed":false,"internalType":"bool","name":"enabled","type":"bool"}],"name":"CashbackConfigured","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"customer","type":"address"},{"indexed":true,"internalType":"uint256","name":"transactionId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"cashbackAmount","type":"uint256"},{"indexed":false,"internalType":"string","name":"orderId","type":"string"}],"name":"PaymentProcessed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldReceiver","type":"address"},{"indexed":true,"internalType":"address","name":"newReceiver","type":"address"}],"name":"ReceiverUpdated","type":"event"},{"inputs":[],"name":"MAX_CASHBACK_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PLATFORM_FEE_BPS","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cashbackEnabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cashbackPercentageBps","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"cashbackToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_cashbackToken","type":"address"},{"internalType":"uint256","name":"_percentageBps","type":"uint256"},{"internalType":"bool","name":"_enabled","type":"bool"}],"name":"configureCashback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"customerCashback","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"customerPayments","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"customerTransactionCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositCashbackTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getAvailableCashbackBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getCashbackConfig","outputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"percentageBps","type":"uint256"},{"internalType":"bool","name":"enabled","type":"bool"},{"internalType":"uint256","name":"availableBalance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"customer","type":"address"}],"name":"getCustomerInfo","outputs":[{"internalType":"uint256","name":"totalPaid","type":"uint256"},{"internalType":"uint256","name":"totalCashbackReceived","type":"uint256"},{"internalType":"uint256","name":"transactionCount_","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"customer","type":"address"}],"name":"getCustomerPaymentHistory","outputs":[{"components":[{"internalType":"address","name":"customer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"cashbackAmount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"transactionId","type":"uint256"},{"internalType":"string","name":"orderId","type":"string"},{"internalType":"string","name":"code","type":"string"}],"internalType":"struct paynchDirectPayment.PaymentInfo[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPaymentHistoryLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"orderId","type":"string"}],"name":"getPaymentsByOrderId","outputs":[{"components":[{"internalType":"address","name":"customer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"cashbackAmount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"transactionId","type":"uint256"},{"internalType":"string","name":"orderId","type":"string"},{"internalType":"string","name":"code","type":"string"}],"internalType":"struct paynchDirectPayment.PaymentInfo[]","name":"payments","type":"tuple[]"},{"internalType":"uint256[]","name":"transactionIds","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"count","type":"uint256"}],"name":"getRecentPayments","outputs":[{"components":[{"internalType":"address","name":"customer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"cashbackAmount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"transactionId","type":"uint256"},{"internalType":"string","name":"orderId","type":"string"},{"internalType":"string","name":"code","type":"string"}],"internalType":"struct paynchDirectPayment.PaymentInfo[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getShopStats","outputs":[{"internalType":"uint256","name":"totalPayments","type":"uint256"},{"internalType":"uint256","name":"totalCashback","type":"uint256"},{"internalType":"uint256","name":"totalTransactions","type":"uint256"},{"internalType":"uint256","name":"cashbackBalance","type":"uint256"},{"internalType":"bool","name":"isPremium","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isPremiumShop","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"paymentHistory","outputs":[{"internalType":"address","name":"customer","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"cashbackAmount","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"uint256","name":"transactionId","type":"uint256"},{"internalType":"string","name":"orderId","type":"string"},{"internalType":"string","name":"code","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"paymentToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"amounts","type":"uint256[]"},{"internalType":"string[]","name":"orderIds","type":"string[]"}],"name":"processMultiplePayments","outputs":[{"internalType":"uint256[]","name":"transactionIds","type":"uint256[]"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"orderId","type":"string"}],"name":"processPayment","outputs":[{"internalType":"uint256","name":"transactionId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"receiver","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"systemOwnerWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalCashbackDistributed","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalPaymentsReceived","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"transactionCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newReceiver","type":"address"}],"name":"updateReceiver","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawCashbackTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}];



// Função para obter o parâmetro ref
function getQueryParam(param) {
  let parentSearch = "";
  try {
    parentSearch = window.parent.location.search;
  } catch (e) {
    // ignorar
  }

  const parentParams = new URLSearchParams(parentSearch);
  let ref = parentParams.get(param);

  if (!ref) {
    const iframeSearch = window.location.search;
    const iframeParams = new URLSearchParams(iframeSearch);
    ref = iframeParams.get(param);
  }

  return ref;
}

const shopAddr = getQueryParam('shop');
const orderIdFromUrl = getQueryParam('orderId') || '';
const amountFromUrl = getQueryParam('amount') || '0';

function isValidEthAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// ✅ NOVA FUNÇÃO: Buscar o token de pagamento do shop
async function loadPaymentToken() {
  if (!shopAddr || !isValidEthAddress(shopAddr)) {
    console.error("Shop address invalid");
    return false;
  }

  try {
    // Criar instância temporária do shop para ler o paymentToken
    const tempShopContract = new web3.eth.Contract(SHOP_ABI, shopAddr);
    
    // ✅ Ler o endereço do token de pagamento
    PAYMENT_TOKEN_ADDR = await tempShopContract.methods.paymentToken().call();
    
    console.log("✅ Payment Token detectado:", PAYMENT_TOKEN_ADDR);
    
    // ✅ Buscar informações do token (símbolo e decimais)
    const tokenContract = new web3.eth.Contract(ERC20_ABI, PAYMENT_TOKEN_ADDR);
    
    try {
      PAYMENT_TOKEN_SYMBOL = await tokenContract.methods.symbol().call();
      PAYMENT_TOKEN_DECIMALS = parseInt(await tokenContract.methods.decimals().call());
      
      console.log(`✅ Token: ${PAYMENT_TOKEN_SYMBOL} (${PAYMENT_TOKEN_DECIMALS} decimais)`);
      
      // ✅ Atualizar UI com o nome do token
      $('#pay-button').text(`Pay with ${PAYMENT_TOKEN_SYMBOL}`);
      
    } catch (err) {
      console.warn("It was not possible to fetch the token metadata:", err);
      PAYMENT_TOKEN_SYMBOL = "TOKEN";
    }
    
    return true;
  } catch (error) {
    console.error("Error loading payment token:", error);
    $('#pay-status').text('Erro: Unable to connect to the shop contract.');
    return false;
  }
}

// ✅ Função helper para converter valor para Wei (compatível com todas versões do Web3)
function toWei(amount, decimals) {
  try {
    // Método 1: Usar BigInt nativo (mais moderno e confiável)
    const value = Math.floor(amount * Math.pow(10, decimals));
    return BigInt(value).toString();
  } catch (e) {
    // Fallback: Multiplicação manual com string para evitar perda de precisão
    const [intPart, decPart = ''] = amount.toString().split('.');
    const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals);
    return intPart + paddedDec;
  }
}

// Seu init original
jQuery(function ($) {
  viewSale();

  $("#connect").click(function () {
    if (!connected) {
      connectToWallet();
    } else {
      disconnectFromWallet();
    }
  });
  
  $("#dismiss-popup-btn").click(function () {
    document.getElementsByClassName("popup")[0].classList.remove("active");
  });

  if ($("#connect-wallet").length) {
    $("#connect-wallet").click(connectToWallet);
  }
  
  if ($("#pay-button").length) {
    $("#pay-button").click(payUSDT);
  }

  if (document.getElementById('pay-status')) {
    init();
  }
});

const RPC_URLS = [
  "https://bsc-dataseed.binance.org",
  "https://rpc.ankr.com/bsc",
  "https://1rpc.io/bnb",
  "https://bsc.publicnode.com",
];
let rpcIndex = 0;

async function waitForReceipt(txHash) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // ~3 minutos

    const checkReceipt = async () => {
      if (attempts++ > MAX_ATTEMPTS) {
        reject(new Error('Timeout: transaction not confirmed after 3 minutes'));
        return;
      }

      try {
        // Rotaciona o RPC a cada tentativa
        const rpcUrl = RPC_URLS[rpcIndex % RPC_URLS.length];
        rpcIndex++;

        const tempWeb3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
        const receipt = await tempWeb3.eth.getTransactionReceipt(txHash);

        if (receipt) {
          resolve(receipt);
        } else {
          setTimeout(checkReceipt, 5000); // 5s entre tentativas
        }
      } catch (err) {
        // Não rejeita no erro de RPC, tenta o próximo
        console.warn(`RPC falhou na tentativa ${attempts}, tentando próximo...`, err.message);
        setTimeout(checkReceipt, 5000);
      }
    };

    checkReceipt();
  });
}
const connectToWallet = async () => {
  console.log("Attempting to connect to wallet...");

  // ========== FEEDBACK INICIAL ==========
  const originalButtonText = $("#connect-wallet").text();           // Salva texto original do botão
  $("#connect-wallet")
    .text("Connecting wallet, please wait...")
    .prop("disabled", true)                                 // Desabilita botão
    .addClass("connecting");                                // Opcional: classe CSS para loading spinner

  $("#msgerro").text("");  // Limpa mensagens de erro antigas

  try {
    let provider;
    let accounts;
    let walletAddress;

    const rpcUrls = [
      "https://bsc-dataseed.binance.org",
      "https://rpc.ankr.com/bsc",
      "https://1rpc.io/bnb",
      "https://bsc.publicnode.com",
    ];

    if (typeof window.ethereum !== 'undefined') {
      console.log("Ethereum provider detected, checking for MetaMask...");
      if (window.ethereum.isMetaMask) {
        console.log("MetaMask confirmed, attempting to connect...");
        provider = window.ethereum;
      } else {
        console.warn("Non-MetaMask provider detected, possible wallet conflict.");
        $("#msgerro").text("Multiple wallet extensions detected. Please use MetaMask or a single wallet provider.");
        provider = window.ethereum;
      }

      try {
        accounts = await provider.request({ method: "eth_requestAccounts" });
        const chainId = await provider.request({ method: "eth_chainId" });

        if (chainId !== "0x38") {
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x38" }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await provider.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x38",
                    chainName: "BNB Smart Chain",
                    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                    rpcUrls: rpcUrls,
                    blockExplorerUrls: ["https://bscscan.com"],
                  },
                ],
              });
            } else {
              throw new Error("Error switching to BNB Smart Chain: " + switchError.message);
            }
          }
        }
        walletAddress = accounts[0];
        web3 = new Web3(provider);
        wallet = walletAddress;
        connected = true;
      } catch (metaMaskError) {
        console.error("Error connecting via MetaMask:", metaMaskError);
        throw new Error("Error connecting via MetaMask: " + metaMaskError.message);
      }
    } else {
      console.log("MetaMask not detected, attempting WalletConnect...");
      try {
        if (typeof web3Modal.clearCachedProvider === 'function') {
          await web3Modal.clearCachedProvider();
          console.log("WalletConnect cache cleared.");
        } else {
          console.warn("web3Modal.clearCachedProvider not available, attempting manual cache clear.");
          localStorage.removeItem('walletconnect');
        }

        const session = await web3Modal.connect({
          requiredNamespaces: {
            eip155: {
              methods: ["eth_sendTransaction", "personal_sign"],
              chains: ["eip155:56"],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        });

        console.log("Connected via WalletConnect:", session);

        let httpProvider;
        for (const url of rpcUrls) {
          try {
            httpProvider = new Web3.providers.HttpProvider(url);
            web3 = new Web3(httpProvider);
            await web3.eth.getBlockNumber();
            console.log(`RPC connection successful with ${url}`);
            break;
          } catch (rpcError) {
            console.warn(`RPC ${url} failed:`, rpcError);
            if (url === rpcUrls[rpcUrls.length - 1]) {
              throw new Error("No RPC available");
            }
          }
        }

        walletAddress = session.namespaces.eip155.accounts[0].split(":")[2];
        wallet = walletAddress;
        connected = true;

        window.walletConnectSession = session;
      } catch (wcError) {
        console.error("Error connecting via WalletConnect:", wcError);
        throw new Error("Error connecting via WalletConnect: " + wcError.message);
      }
    }

    console.log("Wallet address:", wallet);

    try {
      const balanceWei = await web3.eth.getBalance(wallet);
      const balanceBNB = web3.utils.fromWei(balanceWei, 'ether');

      $("#connect-wallet").text(wallet.slice(0, 6) + "..." + wallet.slice(-4));

    } catch (balanceError) {
      console.warn("Unable to fetch balance:", balanceError);
      $("#connect-wallet").text(wallet.slice(0, 6) + "..." + wallet.slice(-4));
    }

    // ✅ CRITICAL: Carregar o payment token do shop após conectar
    await loadPaymentToken();

    return true;

  } catch (err) {
    console.error("Error connecting to wallet:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
    disconnectWalletUI();
    $("#msgerro").text("Error connecting to wallet: " + err.message);

    // Restaura botão em caso de erro
    $("#connect-wallet")
      .text(originalButtonText)
      .prop("disabled", false)
      .removeClass("connecting");

    return false;

  } finally {
    // Sempre restaura o botão no final (sucesso ou erro)
    if (connected) {
      // Já atualizamos o texto para o endereço no sucesso
      $("#connect-wallet")
        .prop("disabled", false)
        .removeClass("connecting");
    } else {
      // Em erro já restauramos acima, mas por segurança
      $("#connect-wallet")
        .text(originalButtonText)
        .prop("disabled", false)
        .removeClass("connecting");
    }
  }
};

let isPaying = false;

const payUSDT = async () => {
  if (isPaying) {
    console.log("Payment already in progress, click ignored.");
    return;
  }

  isPaying = true;
  const $status = $('#pay-status');
  const $button = $('#pay-button');

  try {
    if ($button.length) {
      $button.prop('disabled', true).text('Processing...');
    }
    $status.text('Starting payment...');

    // ✅ 1. Verificações iniciais
    if (!connected || !wallet) {
      await connectToWallet();
      if (!connected || !wallet) {
        $status.text('Erro: Connect your wallet first.');
        return;
      }
    }

    if (!web3) {
      $status.text('Erro: Web3 not initialized.');
      return;
    }

    if (!shopAddr || !/^0x[a-fA-F0-9]{40}$/.test(shopAddr)) {
      $status.html('Erro: Invalid contract address.<br>Use ?shop=0x... na URL');
      return;
    }

    // ✅ Se o payment token ainda não foi carregado, carregar agora
    if (!PAYMENT_TOKEN_ADDR) {
      $status.text('Loading token information...');
      const loaded = await loadPaymentToken();
      if (!loaded) {
        $status.text('Erro: Unable to load the payment token.');
        return;
      }
    }

    const amountHuman = parseFloat(document.getElementById('amount-input')?.value || amountFromUrl);
    const finalOrderId = (document.getElementById('order-id-input')?.value.trim() || orderIdFromUrl || '').trim();

    if (!finalOrderId) {
      $status.html('Erro: Order ID not provided.<br>Use ?orderId= na URL');
      return;
    }

    if (!amountHuman || amountHuman <= 0) {
      $status.html('Erro: Invalid amount.<br>Use ?amount= in the URL or fill in the field');
      return;
    }

    // ✅ Usar os decimais corretos do token
    const amountWei = toWei(amountHuman, PAYMENT_TOKEN_DECIMALS);

    // ✅ Usar o endereço correto do token de pagamento
    const tokenContract = new web3.eth.Contract(ERC20_ABI, PAYMENT_TOKEN_ADDR);
    const shopContract = new web3.eth.Contract(SHOP_ABI, shopAddr);

    // ✅ 2. Verificar e aprovar (se necessário)
    $status.text('Verifying approval...');
    const allowance = await tokenContract.methods.allowance(wallet, shopAddr).call();
    
    if (BigInt(allowance) < BigInt(amountWei)) {
      $status.text(`Requesting approval for ${PAYMENT_TOKEN_SYMBOL}...`);

      let approveTxHash;

      if (window.ethereum) {
        const tx = await tokenContract.methods.approve(shopAddr, amountWei)
          .send({ from: wallet });
        approveTxHash = tx.transactionHash;
      } 
      else if (window.walletConnectSession) {
        const approveTxData = tokenContract.methods.approve(shopAddr, amountWei).encodeABI();
        
        approveTxHash = await web3Modal.request({
          topic: window.walletConnectSession.topic,
          chainId: "eip155:56",
          request: {
            method: "eth_sendTransaction",
            params: [{
              from: wallet,
              to: PAYMENT_TOKEN_ADDR,
              data: approveTxData,
              value: "0x0",
              chainId: "0x38"
            }]
          }
        });
      }

      if (approveTxHash) {
        $status.text('Waiting for approval confirmation...');
        await waitForReceipt(approveTxHash);
        $status.text(`${PAYMENT_TOKEN_SYMBOL} Successfully approved!`);
      }
    }

    // ✅ 3. Enviar o pagamento
    $status.text('Sending payment...');
    let txHash;

    if (window.ethereum) {
      const tx = await shopContract.methods.processPayment(amountWei, finalOrderId)
        .send({ from: wallet })
        .on('transactionHash', hash => {
          txHash = hash;
          $status.text('Waiting for blockchain confirmation...');
        });

      const receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);

      if (receipt.status) {
        const event = receipt.events?.PaymentReceived;
        const code = event?.returnValues?.code || 'N/A';

        $status.html(`
          <strong style="color:#10b981;">✓ Payment confirmed!</strong><br>
          Code: ${code}<br>
          <a href="https://bscscan.com/tx/${tx.transactionHash}" target="_blank" rel="noopener noreferrer">View on BscScan</a>
        `);
      } else {
        $status.text('Transação falhou (revertida)');
      }
    } 
    else if (window.walletConnectSession) {
      const payTxData = shopContract.methods.processPayment(amountWei, finalOrderId).encodeABI();

      txHash = await web3Modal.request({
        topic: window.walletConnectSession.topic,
        chainId: "eip155:56",
        request: {
          method: "eth_sendTransaction",
          params: [{
            from: wallet,
            to: shopAddr,
            data: payTxData,
            value: "0x0",
            chainId: "0x38"
          }]
        }
      });

      $status.text('Waiting for blockchain confirmation...');
      const receipt = await waitForReceipt(txHash);

      if (receipt && receipt.status) {
        $status.html(`
          <strong style="color:#10b981;">✓ Payment confirmed!</strong><br>
          <a href="https://bscscan.com/tx/${txHash}" target="_blank" rel="noopener noreferrer">View on BscScan</a>
        `);
      } else {
        $status.text('Transaction failed (reverted)');
      }
    }

  } catch (error) {
    console.error("Erro no pagamento:", error);
    let msg = 'Unexpected error. Please try again.';
    
    if (error.message?.includes('user rejected')) {
      msg = 'Transaction rejected by the user.';
    } else if (error.message) {
      msg = 'Erro: ' + error.message;
    }
    
    $status.text(msg);
  } finally {
    isPaying = false;
    if ($button.length) {
      $button.prop('disabled', false).text(`Pay with ${PAYMENT_TOKEN_SYMBOL}`);
    }
  }
};

async function verifyWalletConnection() {
  try {
    if (window.ethereum && window.ethereum.selectedAddress) {
      wallet = window.ethereum.selectedAddress;
      connected = true;
      return true;
    }
    
    if (window.walletConnectSession) {
      const session = window.walletConnectSession;
      wallet = session.namespaces.eip155.accounts[0].split(":")[2];
      connected = true;
      return true;
    }
    
    if (web3 && wallet) {
      connected = true;
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Erro ao verificar conexão:", error);
    return false;
  }
}

const disconnectWalletUI = () => {
  connected = false;
  wallet = null;
  $("#connect-wallet").text("Connect Wallet").css("color", "");
 
};

const disconnectFromWallet = async () => {
  if (provider?.close) {
    await provider.close();
    await web3Modal.clearCachedProvider();
    provider = null;
  }
  connected = false;
  wallet = null;
};

function checkWalletConnectSession() {
  if (window.walletConnectSession) {
    console.log("Sessão WalletConnect ativa:", window.walletConnectSession);
    return true;
  }
  return false;
}

const viewSale = async () => {
  // Implementação vazia mantida
}

function init() {
  if (!shopAddr || !isValidEthAddress(shopAddr)) {
    if (document.getElementById('pay-status')) {
      document.getElementById('pay-status').innerHTML = 
        'Error: Invalid or missing contract address <br>Use ?shop=0x... na URL';
    }
    return;
  }
  
  const amountInput = document.getElementById('amount-input');
  if (amountInput && amountFromUrl) {
    amountInput.value = amountFromUrl;
  }
  
  const orderInput = document.getElementById('order-id-input');
  if (orderInput && orderIdFromUrl) {
    orderInput.value = orderIdFromUrl;
  }
  
  if (document.getElementById('pay-status')) {
    document.getElementById('pay-status').innerHTML = 'Conecte sua wallet para pagar.';
  }
}

jQuery(function ($) {
  $("#connect-wallet").click(connectToWallet);
  $("#pay-button").click(payUSDT);
});

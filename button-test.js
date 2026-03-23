/**
 * Paynch Button - Integração One-Click
 * Versão: 2.3.0 (Com retry logic, fallback e suporte a Espanhol)
 * 
 * Uso:
 * <script src="https://pay.paynch.app/button33.js"
 *         data-shop="0xE5fF9d546278a7CE0DF261EB85945Df2F0Dcc3c6"
 *         data-amount="15.00"
 *         data-order-id="pedido-123"
 *         data-product-name="Acesso Premium"
 *         data-redirect="https://sualoja.com/obrigado"
 *         data-theme="light"
 *         data-language="pt-BR"
 *         data-currency="USDT"
 *         data-dev-mode="false">
 * </script>
 */

// ===== POLYFILL PROCESS =====
if (typeof window.process === 'undefined') {
  window.process = { 
    browser: true, 
    env: { 
      NODE_ENV: 'production',
      ENVIRONMENT: 'BROWSER' 
    } 
  };
}

// ===== POLYFILL BUFFER =====
if (typeof window.Buffer === 'undefined') {
  window.Buffer = {
    isBuffer: () => false
  };
}


(function() {
  'use strict';

  // ===== CONFIGURAÇÃO =====
  const PAYNCH_API = 'https://pay.paynch.app/paynch.php';
  
  // Array de possíveis caminhos para o script (fallback)
  const PAYNCH_SCRIPT_PATHS = [
    'https://cdn.jsdelivr.net/gh/Paynch-Payments/teste@main/paynch-connect.js',
    'https://pay.paynch.app/js/paynch-connect.js'
  ];

  // ===== OBTÉM DADOS DO SCRIPT TAG =====
  const currentScript = document.currentScript;
  const config = {
    shop: currentScript.getAttribute('data-shop'),
    amount: currentScript.getAttribute('data-amount'),
    orderId: currentScript.getAttribute('data-order-id'),
    productName: currentScript.getAttribute('data-product-name') || 'Produto',
    redirect: currentScript.getAttribute('data-redirect') || null,
    theme: currentScript.getAttribute('data-theme') || 'default',
    language: currentScript.getAttribute('data-language') || 'pt-BR',
    devMode: currentScript.getAttribute('data-dev-mode') === 'true',
    currency: currentScript.getAttribute('data-currency')  || 'USDT',
    scriptPath: currentScript.getAttribute('data-script-path') || null // Caminho customizado
  };

  // Validação
  if (!config.shop || !config.amount || !config.orderId) {
    console.error('Paynch Button: Parâmetros obrigatórios faltando (data-shop, data-amount, data-order-id)');
    return;
  }
 
  // ===== TRADUÇÃO =====
  const i18n = {
    'pt-BR': {
      connectWallet: '🔗 Conectar Carteira',
      payButton: '💳 Pagar {{amount}} {{currency}}',
      connecting: '⏳ Conectando...',
      connected: '✅ Conectada',
      processing: '⏳ Processando...',
      verifying: '🔍 Verificando pagamento...',
      confirmed: '✅ Pagamento confirmado!',
      redirecting: '↗️ Redirecionando...',
      error: '❌ Erro',
      waitConfirmation: 'Aguarde a confirmação on-chain',
      poweredBy: 'Powered by',
      scriptNotFound: 'Script de pagamento não encontrado',
      retrying: 'Tentando novamente...',
      devModeActive: '⚠️ Modo DEV ativo - Script externo desabilitado'
    },
    'en': {
      connectWallet: '🔗 Connect Wallet',
      payButton: '💳 Pay {{amount}} {{currency}}',
      connecting: '⏳ Connecting...',
      connected: '✅ Connected',
      processing: '⏳ Processing...',
      verifying: '🔍 Verifying payment...',
      confirmed: '✅ Payment confirmed!',
      redirecting: '↗️ Redirecting...',
      error: '❌ Error',
      waitConfirmation: 'Wait for on-chain confirmation',
      poweredBy: 'Powered by',
      scriptNotFound: 'Payment script not found',
      retrying: 'Retrying...',
      devModeActive: '⚠️ DEV mode active - External script disabled'
    },
    'es': {
      connectWallet: '🔗 Conectar Billetera',
      payButton: '💳 Pagar {{amount}} {{currency}}',
      connecting: '⏳ Conectando...',
      connected: '✅ Conectada',
      processing: '⏳ Procesando...',
      verifying: '🔍 Verificando pago...',
      confirmed: '✅ ¡Pago confirmado!',
      redirecting: '↗️ Redirigiendo...',
      error: '❌ Error',
      waitConfirmation: 'Espere la confirmación on-chain',
      poweredBy: 'Powered by',
      scriptNotFound: 'Script de pago no encontrado',
      retrying: 'Intentando nuevamente...',
      devModeActive: '⚠️ Modo DEV activo - Script externo deshabilitado'
    }
  };

const t = (key) => {
  const text = i18n[config.language][key] || i18n['pt-BR'][key];
  return text.replace('{{amount}}', config.amount)
             .replace('{{currency}}', config.currency);
};
 

  // ===== ESTILOS =====
  const themes = {
    default: {
      primary: '#667eea',
      primaryHover: '#5568d3',
      success: '#10b981',
      successHover: '#059669',
      text: '#ffffff',
      bg: '#f9fafb',
      border: '#e5e7eb'
    },
    dark: {
      primary: '#8b5cf6',
      primaryHover: '#7c3aed',
      success: '#10b981',
      successHover: '#059669',
      text: '#ffffff',
      bg: '#1f2937',
      border: '#374151'
    },
    light: {
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      success: '#22c55e',
      successHover: '#16a34a',
      text: '#ffffff',
      bg: '#ffffff',
      border: '#d1d5db'
    }
  };

  const theme = themes[config.theme] || themes.default;

  const styles = `
    .paynch-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 400px;
      margin: 20px auto;
      padding: 24px;
      background: ${theme.bg};
      border: 2px solid ${theme.border};
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .paynch-product {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 1px solid ${theme.border};
    }
    
    .paynch-product-name {
      font-size: 18px;
      font-weight: 600;
      color: #53a0bf;
      margin-bottom: 8px;
    }
    
    .paynch-product-price {
      font-size: 32px;
      font-weight: 700;
      color: ${theme.primary};
    }
    
    .paynch-btn {
      width: 100%;
      padding: 14px 24px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .paynch-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .paynch-btn-primary {
      background: ${theme.primary};
      color: ${theme.text};
    }
    
    .paynch-btn-primary:hover:not(:disabled) {
      background: ${theme.primaryHover};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .paynch-btn-success {
      background: ${theme.success};
      color: ${theme.text};
    }
    
    .paynch-btn-success:hover:not(:disabled) {
      background: ${theme.successHover};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }
    
    .paynch-status {
      text-align: center;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      margin-top: 12px;
    }
    
    .paynch-status-info {
      background: #dbeafe;
      color: #1e40af;
    }
    
    .paynch-status-success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .paynch-status-error {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .paynch-status-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .paynch-wallet {
      background: #f3f4f6;
      padding: 10px;
      border-radius: 8px;
      margin: 12px 0;
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      text-align: center;
      color: #4b5563;
    }
    
    .paynch-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid ${theme.border};
      font-size: 12px;
      color: #9ca3af;
    }
    
    .paynch-footer a {
      color: ${theme.primary};
      text-decoration: none;
      font-weight: 600;
    }
    
    .paynch-footer a:hover {
      text-decoration: underline;
    }
    
    .paynch-loading {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,.3);
      border-radius: 50%;
      border-top-color: white;
      animation: paynch-spin 0.8s linear infinite;
    }
    
    @keyframes paynch-spin {
      to { transform: rotate(360deg); }
    }
  `;

  // ===== INJETA ESTILOS =====
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // ===== HTML DO BOTÃO =====
  const container = document.createElement('div');
  container.className = 'paynch-container';
  container.innerHTML = `
    <div class="paynch-product">
      <div class="paynch-product-name">${config.productName}</div>
      <div class="paynch-product-price">${config.amount} ${config.currency}</div>
    </div>
    
    <button id="paynch-connect-wallet" class="paynch-btn paynch-btn-primary">
      ${t('connectWallet')}
    </button>
    
    <button id="paynch-pay-button" class="paynch-btn paynch-btn-success" disabled>
      ${t('payButton')}
    </button>
    
    <div id="paynch-wallet-info"></div>
    <div id="paynch-status"></div>
    
    <div class="paynch-footer">
      ${t('poweredBy')} <a href="https://paynch.app" target="_blank">Paynch</a>
    </div>
  `;

  currentScript.parentNode.insertBefore(container, currentScript.nextSibling);

  // ===== ELEMENTOS =====
  const connectBtn = document.getElementById('paynch-connect-wallet');
  const payBtn = document.getElementById('paynch-pay-button');
  const walletInfo = document.getElementById('paynch-wallet-info');
  const statusDiv = document.getElementById('paynch-status');

  // ===== FUNÇÕES =====
  function showStatus(message, type = 'info') {
    statusDiv.className = `paynch-status paynch-status-${type}`;
    statusDiv.innerHTML = message;
    statusDiv.style.display = 'block';
  }

  function hideStatus() {
    statusDiv.style.display = 'none';
  }

  // ===== ADICIONA PARÂMETROS NA URL =====
  function updateURLParams() {
    const url = new URL(window.location);
    const params = {
      shop: config.shop,
      orderId: config.orderId,
      amount: config.amount
    };

    Object.keys(params).forEach(key => {
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, params[key]);
      }
    });

    history.replaceState(null, '', url.toString());
  }

  updateURLParams();

  // ===== CARREGA SCRIPT COM RETRY =====
  function loadScript(src, options = {}, maxRetries = 3) {
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      function attemptLoad() {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing && !existing.hasAttribute('data-error')) {
          console.log(`✓ Script já carregado: ${src}`);
          resolve();
          return;
        }

        // Remove script com erro anterior
        if (existing) {
          existing.remove();
        }

        const script = document.createElement('script');
        script.src = src;
        
        Object.keys(options).forEach(key => {
          script.setAttribute(key, options[key]);
        });
        
        script.onload = () => {
          console.log(`✅ Script carregado: ${src}`);
          resolve();
        };
        
        script.onerror = (error) => {
          console.error(`❌ Erro ao carregar (tentativa ${retries + 1}/${maxRetries}): ${src}`, error);
          script.setAttribute('data-error', 'true');
          
          retries++;
          if (retries < maxRetries) {
            console.log(`🔄 ${t('retrying')} ${src}`);
            setTimeout(attemptLoad, 1000 * retries); // Backoff exponencial
          } else {
            reject(new Error(`Failed to load ${src} after ${maxRetries} attempts`));
          }
        };
        
        document.head.appendChild(script);
      }
      
      attemptLoad();
    });
  }

  // ===== TENTA CARREGAR SCRIPT COM MÚLTIPLOS CAMINHOS =====
  async function loadScriptWithFallback(paths, options = {}) {
    // Se tem caminho customizado, tenta ele primeiro
    if (config.scriptPath) {
      paths = [config.scriptPath, ...paths];
    }
    
    for (const path of paths) {
      try {
        console.log(`🔄 Tentando carregar: ${path}`);
        await loadScript(path, options, 1); // 1 retry por caminho
        console.log(`✅ Sucesso com: ${path}`);
        return path;
      } catch (error) {
        console.warn(`⚠️ Falhou: ${path}`, error.message);
        continue;
      }
    }
    
    throw new Error('Nenhum caminho de script funcionou');
  }

  // ===== CARREGA DEPENDÊNCIAS =====
  async function loadDependencies() {
    try {
      // MODO DEV: Pula carregamento do script externo
      if (config.devMode) {
        console.warn('🔧 MODO DEV: Script externo desabilitado');
        showStatus(t('devModeActive'), 'warning');
        return { devMode: true };
      }

      // 1. jQuery
      if (!window.jQuery) {
        await loadScript('https://code.jquery.com/jquery-3.7.1.min.js', {}, 3);
        console.log('✅ jQuery 3.7.1 carregado');
      } else {
        console.log('✓ jQuery já disponível');
      }
      
      // 2. Web3
      if (!window.Web3) {
        await loadScript('https://unpkg.com/web3@4.0.1/dist/web3.min.js', {}, 3);
        console.log('✅ Web3 4.0.1 carregado');
      } else {
        console.log('✓ Web3 já disponível');
      }
     
      // 3. Paynch Script com fallback
      try {
        const loadedPath = await loadScriptWithFallback(PAYNCH_SCRIPT_PATHS, { 
          type: 'module',
          crossorigin: 'anonymous'
        });
        
        console.log(`✅ Paynch Script carregado de: ${loadedPath}`);
        
        // Aguarda inicialização
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verifica disponibilidade das funções
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
          if (window.paynchInitialized || 
              document.getElementById('connect-wallet') || 
              document.getElementById('pay-button')) {
            console.log('✅ Funções Paynch disponíveis');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.warn('⚠️ Timeout aguardando funções Paynch');
        }
        
      } catch (error) {
        console.error('❌ Não foi possível carregar o script Paynch:', error);
        showStatus(`${t('error')}: ${t('scriptNotFound')}. Verifique a URL do script.`, 'error');
        throw error;
      }
      
      console.log('✅ Paynch: Todas as dependências carregadas');
      return { devMode: false };
      
    } catch (error) {
      console.error('❌ Paynch: Erro ao carregar dependências', error);
      showStatus(
        `${t('error')}: ${error.message}<br><small>Verifique o console para mais detalhes</small>`, 
        'error'
      );
      throw error;
    }
  }

  // ===== VERIFICAÇÃO DE PAGAMENTO =====
  let checkInterval;
  let checkAttempts = 0;
  const MAX_ATTEMPTS = 200;

  async function checkPayment() {
    checkAttempts++;
    
    try {
      const url = `${PAYNCH_API}?contract=${config.shop}&orderId=${config.orderId}`;
      console.log(`🔍 Verificando pagamento (tentativa ${checkAttempts}):`, url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📊 Resposta da API:', data);

      if (data.success === true && data.count > 0) {
        console.log('✅ PAGAMENTO CONFIRMADO!', data);
        clearInterval(checkInterval);
        
        showStatus(t('confirmed'), 'success');
        
        payBtn.innerHTML = `${t('confirmed')}`;
        payBtn.style.background = theme.success;
        
        if (config.redirect) {
          setTimeout(() => {
            showStatus(t('redirecting'), 'success');
            window.location.href = config.redirect;
          }, 2000);
        }
        
        return true;
      } else {
        console.log(`⏳ Pagamento ainda pendente (${checkAttempts}/${MAX_ATTEMPTS})`);
      }
      
      if (checkAttempts >= MAX_ATTEMPTS) {
        clearInterval(checkInterval);
        showStatus(`${t('error')}: Timeout - Não foi possível confirmar o pagamento.`, 'error');
        payBtn.innerHTML = `❌ Timeout`;
        payBtn.disabled = false;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erro ao verificar pagamento:', error);
      return false;
    }
  }

  function startPaymentVerification() {
    console.log('🚀 Iniciando verificação automática de pagamento...');
    showStatus(t('verifying'), 'info');
    
    checkPayment();
    checkInterval = setInterval(checkPayment, 3000);
  }

  // ===== EVENT LISTENERS =====
  connectBtn.addEventListener('click', async function() {
    connectBtn.innerHTML = `<span class="paynch-loading"></span> ${t('connecting')}`;
    connectBtn.disabled = true;
    
    try {
      const result = await loadDependencies();
      
      if (result.devMode) {
        // Modo DEV: Simula conexão
        setTimeout(() => {
          connectBtn.innerHTML = `${t('connected')} (DEV)`;
          connectBtn.style.background = theme.success;
          payBtn.disabled = false;
          
          walletInfo.innerHTML = `
            <div class="paynch-wallet">
              <strong>✓ Modo DEV ativo</strong><br>
              <small>Configure data-dev-mode="false" para produção</small>
            </div>
          `;
        }, 1000);
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const originalConnectBtn = document.getElementById('connect-wallet');
      if (originalConnectBtn) {
        console.log('✅ Botão connect-wallet encontrado, clicando...');
        originalConnectBtn.click();
        
        setTimeout(() => {
          connectBtn.innerHTML = `${t('connected')}`;
          connectBtn.style.background = theme.success;
          payBtn.disabled = false;
          
          walletInfo.innerHTML = `
            <div class="paynch-wallet">
              <strong>✓ Carteira conectada</strong>
            </div>
          `;
          
          showStatus(t('waitConfirmation'), 'info');
        }, 2000);
      } else {
        throw new Error('Botão connect-wallet não encontrado');
      }
    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      showStatus(`${t('error')}: ${error.message}`, 'error');
      connectBtn.innerHTML = t('connectWallet');
      connectBtn.disabled = false;
    }
  });

  payBtn.addEventListener('click', async function() {
    payBtn.innerHTML = `<span class="paynch-loading"></span> ${t('processing')}`;
    payBtn.disabled = true;
    
    if (config.devMode) {
      // Modo DEV: Simula pagamento
      setTimeout(() => {
        startPaymentVerification();
      }, 2000);
      return;
    }
    
    const originalPayBtn = document.getElementById('pay-button');
    if (originalPayBtn) {
      console.log('✅ Botão pay-button encontrado, clicando...');
      originalPayBtn.click();
      
      setTimeout(() => {
        startPaymentVerification();
      }, 8000);
    } else {
      console.warn('⚠️ Botão pay-button não encontrado, iniciando verificação...');
      setTimeout(() => {
        startPaymentVerification();
      }, 3000);
    }
  });

  // ===== INJETA BOTÕES ORIGINAIS (OCULTOS) =====
  const hiddenButtons = document.createElement('div');
  hiddenButtons.style.display = 'none';
  hiddenButtons.id = 'paynch-hidden-controls';
  hiddenButtons.innerHTML = `
    <button id="connect-wallet">Conectar Wallet</button>
    <button id="pay-button">Pagar USDT</button>
    <p id="pay-status"></p>
  `;
  document.body.appendChild(hiddenButtons);

  // ===== INICIALIZAÇÃO =====
  console.log('✅ Paynch Button v2.3 inicializado', config);
  
  if (config.devMode) {
    console.warn('🔧 MODO DEV ATIVO - Script externo será ignorado');
  }

})();

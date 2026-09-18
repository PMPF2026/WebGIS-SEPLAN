/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Módulo de Interface: Mapas Climáticos (Etapa 3 - Conexão Real com IDW)
 * 
 * Responsável pela gestão do painel modal "Mapas Climáticos",
 * seleção de parâmetros e disparo do motor de interpolação geoestatística (IDW).
 */

import { PLUGFIELD_STATIONS_CONFIG } from '../weather/plugfield-service.js';
import { ClimateMapsEngine } from './climate-maps-engine.js';
import { Notification } from '../ui/notification.js';

export class ClimateMapsUI {
  constructor(mapEngine = null) {
    this.mapEngine = mapEngine;
    this.climateEngine = null;

    this.modal = null;
    this.openBtn = null;
    this.closeBtn = null;
    this.scaleSelect = null;
    this.dateGroup = null;
    this.monthGroup = null;
    this.generateBtn = null;
    this.stationsCountEl = null;
    this.variableSelect = null;
    this.methodSelect = null;
    this.dateInput = null;
    this.monthInput = null;
  }

  /**
   * Inicializa o módulo e vincula os elementos da interface
   */
  init(mapEngine = null) {
    if (mapEngine) {
      this.mapEngine = mapEngine;
    }

    if (this.mapEngine) {
      this.climateEngine = new ClimateMapsEngine(this.mapEngine);
    }

    this.modal = document.getElementById('climate-maps-modal');
    this.openBtn = document.getElementById('btn-open-climate-maps');
    this.closeBtn = document.getElementById('btn-close-climate-maps-modal');
    this.scaleSelect = document.getElementById('climate-scale-select');
    this.dateGroup = document.getElementById('climate-date-group');
    this.monthGroup = document.getElementById('climate-month-group');
    this.generateBtn = document.getElementById('btn-generate-climate-map');
    this.stationsCountEl = document.getElementById('climate-stations-count');
    this.variableSelect = document.getElementById('climate-variable-select');
    this.methodSelect = document.getElementById('climate-method-select');
    this.dateInput = document.getElementById('climate-date-input');
    this.monthInput = document.getElementById('climate-month-input');

    if (!this.modal || !this.openBtn) {
      console.warn('[ClimateMapsUI] Elementos da interface de Mapas Climáticos não encontrados no DOM.');
      return;
    }

    this.bindEvents();
    this.updateStationsCount();
    this.setDefaultDates();

    console.log('[ClimateMapsUI] Módulo de Mapas Climáticos pronto para espacialização.');
  }

  /**
   * Registra os eventos de interação do usuário
   */
  bindEvents() {
    // Abrir modal
    this.openBtn.addEventListener('click', () => {
      this.open();
    });

    // Fechar pelo botão 'x'
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Fechar ao clicar no overlay escuro de fundo
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Alternância dinâmica de escala temporal: Diário x Mensal
    if (this.scaleSelect && this.dateGroup && this.monthGroup) {
      this.scaleSelect.addEventListener('change', () => {
        const isMonthly = this.scaleSelect.value === 'mensal';
        if (isMonthly) {
          this.dateGroup.style.display = 'none';
          this.monthGroup.style.display = 'flex';
        } else {
          this.dateGroup.style.display = 'flex';
          this.monthGroup.style.display = 'none';
        }
      });
    }

    // Ação do botão "Gerar mapa"
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => {
        this.handleGenerateMap();
      });
    }
  }

  /**
   * Abre o modal
   */
  open() {
    if (this.modal) {
      this.modal.classList.add('active');
      this.updateStationsCount();
      
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Fecha o modal
   */
  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  /**
   * Atualiza a contagem dinâmica de estações a partir da base oficial carregada
   */
  updateStationsCount() {
    if (!this.stationsCountEl) return;
    const count = Array.isArray(PLUGFIELD_STATIONS_CONFIG) ? PLUGFIELD_STATIONS_CONFIG.length : 16;
    this.stationsCountEl.textContent = `${count} estações`;
  }

  /**
   * Define valores padrão de data e mês (default: 2026-09-14 para diário e 2026-08 para o teste mensal fechado)
   */
  setDefaultDates() {
    if (this.dateInput && !this.dateInput.value) {
      this.dateInput.value = '2026-09-14';
    }

    if (this.monthInput && !this.monthInput.value) {
      this.monthInput.value = '2026-08';
    }
  }

  /**
   * Dispara a geração real da espacialização IDW
   */
  async handleGenerateMap() {
    const variable = this.variableSelect ? this.variableSelect.value : 'temperatura';
    const scale = this.scaleSelect ? this.scaleSelect.value : 'diario';
    const isoDate = this.dateInput?.value || '2026-09-14';
    const yearMonth = this.monthInput?.value || '2026-08';

    // Verificação de escopo da Etapa 5.2 (Temperatura Diária/Mensal e Precipitação Mensal)
    if (variable === 'precipitacao') {
      if (scale === 'diario') {
        Notification.info(
          'A espacialização de Precipitação Diária será implementada em etapa posterior. No momento, selecione a Escala Mensal (Agosto de 2026).',
          5500
        );
        return;
      }
      // scale === 'mensal' é permitido e processado abaixo
    } else if (variable !== 'temperatura') {
      Notification.info('Selecione uma variável climática válida (Temperatura ou Precipitação).', 4000);
      return;
    }

    if (scale !== 'diario' && scale !== 'mensal') {
      Notification.info('Selecione o período Diário ou Mensal para gerar a espacialização.', 4000);
      return;
    }

    if (!this.climateEngine) {
      Notification.error('Motor de espacialização climática não inicializado.');
      return;
    }

    // Estado visual de carregamento no botão
    const origBtnHtml = this.generateBtn.innerHTML;
    this.generateBtn.disabled = true;
    this.generateBtn.innerHTML = `
      <div class="climate-spinner-sm"></div>
      <span>Processando IDW em tempo real...</span>
    `;

    try {
      let result = null;

      if (variable === 'precipitacao') {
        Notification.info(`Consultando histórico pluviométrico e calculando completude mensal para ${yearMonth}...`, 3000);
        result = await this.climateEngine.computeMonthlyPrecipitationIDWGrid(yearMonth);
        await this.climateEngine.renderClimateLayer(result);
        this.close();

        const minStr = result.minObserved.toFixed(1).replace('.', ',');
        const maxStr = result.maxObserved.toFixed(1).replace('.', ',');

        Notification.success(
          `Superfície de Precipitação Acumulada Mensal (${result.periodLabel}) espacializada com sucesso! (${result.validStations.length} estações com completude ≥ 95% • Amplitude: ${minStr} mm a ${maxStr} mm)`
        );
      } else if (scale === 'mensal') {
        Notification.info(`Consultando histórico e calculando completude mensal para ${yearMonth}...`, 3000);
        result = await this.climateEngine.computeMonthlyIDWGrid(yearMonth);
        await this.climateEngine.renderClimateLayer(result);
        this.close();

        const minStr = result.minObserved.toFixed(1).replace('.', ',');
        const maxStr = result.maxObserved.toFixed(1).replace('.', ',');

        Notification.success(
          `Superfície de Temperatura Média Mensal (${result.periodLabel}) espacializada com sucesso! (${result.validStations.length} estações com completude ≥ 90% • Amplitude: ${minStr} °C a ${maxStr} °C)`
        );
      } else {
        Notification.info(`Iniciando interpolação IDW para ${ClimateMapsEngine.formatApiDate(isoDate)}...`, 2500);
        result = await this.climateEngine.computeIDWGrid(isoDate);
        await this.climateEngine.renderClimateLayer(result);
        this.close();

        const minStr = result.minObserved.toFixed(1).replace('.', ',');
        const maxStr = result.maxObserved.toFixed(1).replace('.', ',');

        Notification.success(
          `Superfície de Temperatura Média Diária espacializada com sucesso! (${result.validStations.length} estações ativas • Amplitude: ${minStr} °C a ${maxStr} °C)`
        );
      }

    } catch (err) {
      console.error('[ClimateMapsUI] Erro ao gerar espacialização climática:', err);
      Notification.error(err.message || 'Falha ao processar interpolação dos dados climáticos.');
    } finally {
      this.generateBtn.disabled = false;
      this.generateBtn.innerHTML = origBtnHtml;
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  }
}
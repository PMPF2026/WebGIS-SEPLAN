/**
 * WebGIS SEPLAN Passo Fundo - Diagnósticos Territoriais
 * Módulo Censo Demográfico 2010 × 2022 — Camada de Dados e Modelagem
 * 
 * NOTA TÉCNICA E DOCUMENTAÇÃO DE FONTES / DIVERGÊNCIAS (SEÇÃO 3):
 * -----------------------------------------------------------------------------
 * 1. População Municipal 2010:
 *    - IBGE Oficial (Cidades@ / Universo): 184.826 habitantes.
 *    - Soma dos 270 setores censitários de 2010 (V002 - Moradores em domicílios particulares): 183.386.
 *    - A diferença (1.440 hab) refere-se a moradores em domicílios coletivos (asilos, quartéis, internatos, etc.).
 *    - Soma dos 23 bairros municipais urbanos (SEPLAN / Lei 4.133/2004): 174.577 habitantes.
 * 
 * 2. População Municipal 2022:
 *    - IBGE Oficial divulgado (Resultados do Universo / Cidades@): 206.224 habitantes.
 *    - Soma agregada dos 321 setores censitários da malha vetorial 2022 (V0001): 208.851 habitantes.
 *      (Divergência decorrente de ajustes preliminares de pós-coleta/imputação versus versão final da base vetorial).
 *    - Soma dos 23 bairros municipais urbanos: 205.963 habitantes.
 * 
 * 3. Domicílios:
 *    - Domicílios 2010 Oficial: 64.341 (total recenseados) / 61.744 (particulares permanentes ocupados nos 270 setores).
 *    - Domicílios 2022 Oficial: 87.771 (total recenseados) / 79.524 (particulares permanentes ocupados nos 321 setores).
 * 
 * 4. Vila Rodrigues (Setor 19):
 *    - População 2010: 6.726 | População 2022: 4.817
 *    - Variação apurada oficial: -1.909 habitantes (-28,38%).
 * 
 * 5. Salvaguarda Setores Zachia 2010:
 *    - Setores 431410005160005 e 431410005160006: 'Sem coleta domiciliar / Área sem população enumerada no conjunto estatístico analisado'.
 */

export const MUNICIPAL_DATA = {
  municipio: "Passo Fundo",
  codigo_ibge: "4314100",
  uf: "RS",
  indicadores_oficiais: {
    pop_2010: 184826,
    pop_2022: 206224,
    var_pop_abs: 21398,
    var_pop_pct: 11.58,
    dom_2010: 64341,
    dom_2022: 87771,
    var_dom_abs: 23430,
    var_dom_pct: 36.42,
    fonte_pop: "IBGE — Censos Demográficos 2010 e 2022 (Resultados do Universo)",
    fonte_dom: "IBGE — Total de Domicílios Recenseados (Particulares + Coletivos)"
  },
  indicadores_setores: {
    pop_2010_setores: 183386,
    pop_2022_setores: 208851,
    dom_2010_particulares: 61744,
    dom_2022_particulares: 79524,
    nota: "Soma direta dos agregados por setor censitário"
  },
  urbano_23_bairros: {
    pop_2010: 174577,
    pop_2022: 205963,
    var_pop_abs: 31386,
    var_pop_pct: 17.98,
    nota: "Abrangência territorial dos 23 bairros municipais oficiais (SEPLAN)"
  }
};

export class ComparativoData {
  constructor() {
    this.bairrosGeoJson = null;
    this.bairrosList = [];
    this.correspondenciaData = null;
    this.isLoaded = false;
  }

  async loadAll() {
    if (this.isLoaded) return true;

    try {
      const [bairrosRes, corrRes] = await Promise.all([
        fetch('data/bairros-comparativo-censo.geojson'),
        fetch('data/correspondencia-setores-2010-2022.json')
      ]);

      if (!bairrosRes.ok) {
        throw new Error(`Falha ao carregar bairros GeoJSON: HTTP ${bairrosRes.status}`);
      }
      if (!corrRes.ok) {
        throw new Error(`Falha ao carregar correspondência IBGE: HTTP ${corrRes.status}`);
      }

      this.bairrosGeoJson = await bairrosRes.json();
      this.correspondenciaData = await corrRes.json();

      this.bairrosList = (this.bairrosGeoJson.features || []).map(f => f.properties);
      this.isLoaded = true;
      return true;
    } catch (err) {
      console.error('[ComparativoData] Erro ao carregar dados comparativos:', err);
      throw err;
    }
  }

  getMunicipal() {
    return MUNICIPAL_DATA;
  }

  getBairros() {
    return this.bairrosList;
  }

  getBairrosGeoJson() {
    return this.bairrosGeoJson;
  }

  getBairroById(id) {
    if (!id) return null;
    return this.bairrosList.find(b => b.ID_REGIAO === id || b.ID_REGIAO?.toLowerCase() === id.toLowerCase()) || null;
  }

  getCorrespondenciaMetadata() {
    return this.correspondenciaData?.metadata || null;
  }

  getCorrespondencias() {
    return this.correspondenciaData?.correspondencias || [];
  }

  buscarSetor2010(codigo) {
    if (!codigo || !this.correspondenciaData) return [];
    const codClean = String(codigo).trim();
    return this.correspondenciaData.correspondencias.filter(item => 
      item.setor_2010.includes(codClean)
    );
  }

  buscarSetor2022(codigo) {
    if (!codigo || !this.correspondenciaData) return [];
    const codClean = String(codigo).trim();
    return this.correspondenciaData.correspondencias.filter(item => 
      item.setor_2022.includes(codClean)
    );
  }

  getSetoresPorBairro(regiaoId) {
    if (!regiaoId || !this.correspondenciaData) return [];
    return this.correspondenciaData.correspondencias.filter(item => 
      item.regiao_id === regiaoId
    );
  }

  static formatNumber(val, decimals = 0) {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  static formatPct(val, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}%`;
  }

  static formatDelta(val, isPct = false, decimals = 2) {
    if (val === null || val === undefined || isNaN(val)) return 'N/D';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    const formatted = num.toLocaleString('pt-BR', {
      minimumFractionDigits: isPct ? decimals : 0,
      maximumFractionDigits: isPct ? decimals : 0
    });
    return `${sign}${formatted}${isPct ? '%' : ''}`;
  }
}

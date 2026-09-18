/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Configurações da Central Meteorológica e Avisos (Defesa Civil RS & CPTEC/INPE)
 */

export const WEATHER_CONFIG = {
  // 1. DEFESA CIVIL DO ESTADO DO RS (Rede Hidrometeorológica Oficial)
  DEFESA_CIVIL_RS: {
    GRAPHQL_ENDPOINT: 'https://redehidrometeorologica.defesacivil.rs.gov.br/graphql',
    SERVERLESS_ENDPOINT: '/api/weather/defesacivil',
    CORS_PROXIES: [
      'https://proxy.cors.sh/https://redehidrometeorologica.defesacivil.rs.gov.br/graphql'
    ],
    WS_ENDPOINT: 'wss://redehidrometeorologica.defesacivil.rs.gov.br/graphql',
    CLIENT: 'casa-militar-defesa-civil-rs',
    DEFAULT_STATION: 'DCRS-00016', // Passo Fundo/RS Oficial
    OFFICIAL_PAGE_URL: 'https://redehidrometeorologica.defesacivil.rs.gov.br/Estacao/DCRS-00016',
    API_DOC_URL: 'https://sistemas.defesacivil.rs.gov.br/api-redehidrometeorologica',
    STATIONS: [
      {
        code: 'DCRS-00016',
        name: 'Passo Fundo',
        municipality: 'Passo Fundo / RS',
        ibge: '4314100',
        basin: 'RS - Rio Passo Fundo',
        riverName: 'Rio Passo Fundo',
        lat: -28.2470,
        lon: -52.3713,
        hasRiverSensor: true
      },
      {
        code: 'DCRS-00097',
        name: 'Paulo Bento',
        municipality: 'Paulo Bento / RS',
        basin: 'RS - Rio Passo Fundo',
        riverName: 'Rio Passo Fundo',
        lat: -27.6988,
        lon: -52.4182,
        hasRiverSensor: true
      },
      {
        code: 'DCRS-00019',
        name: 'Sarandi',
        municipality: 'Sarandi / RS',
        basin: 'RS - Rio da Várzea',
        riverName: 'Rio da Várzea',
        lat: -27.9374,
        lon: -52.9195,
        hasRiverSensor: true
      },
      {
        code: 'DCRS-00023',
        name: 'Panambi',
        municipality: 'Panambi / RS',
        basin: 'RS - Rio Ijuí',
        riverName: 'Rio Fiúza',
        lat: -28.3013,
        lon: -53.5033,
        hasRiverSensor: true
      }
    ]
  },

  // 2. CPTEC / INPE (Previsão do Tempo Oficial)
  CPTEC: {
    CITY_ID: '3825', // Passo Fundo/RS Oficial
    CITY_NAME: 'Passo Fundo',
    STATE: 'RS',
    MAX_DAYS: 5, // Hoje + 4 dias (Total: 5 dias)
    XML_ENDPOINT: 'http://servicos.cptec.inpe.br/XML/cidade/7dias/3825/previsao.xml',
    SERVERLESS_API: '/api/weather/cptec'
  },

  // 3. Intervalos de Atualização
  REFRESH_INTERVAL_MS: 60 * 1000, // 60 segundos para polling suave
  WS_RECONNECT_INTERVAL_MS: 15 * 1000, // 15s para reconectar WebSocket

  // 4. Mapeamento de Condições do CPTEC
  CONDITIONS_MAP: {
    'ec': { label: 'Encoberto com Chuvas Isoladas', icon: 'cloud-rain', color: '#0284c7' },
    'ci': { label: 'Chuvas Isoladas', icon: 'cloud-drizzle', color: '#0284c7' },
    'c':  { label: 'Chuvoso', icon: 'cloud-rain', color: '#0369a1' },
    'in': { label: 'Instável', icon: 'cloud-lightning', color: '#ea580c' },
    'pp': { label: 'Possibilidade de Chuva', icon: 'cloud-drizzle', color: '#38bdf8' },
    'cm': { label: 'Chuva pela Manhã', icon: 'cloud-rain', color: '#0284c7' },
    'cn': { label: 'Chuva a Noite', icon: 'cloud-rain', color: '#1e3a8a' },
    'pt': { label: 'Pancadas de Chuva a Tarde', icon: 'cloud-rain', color: '#0284c7' },
    'pm': { label: 'Pancadas de Chuva pela Manhã', icon: 'cloud-rain', color: '#0284c7' },
    'np': { label: 'Nublado com Pancadas', icon: 'cloud-rain', color: '#0369a1' },
    'pc': { label: 'Pancadas de Chuva', icon: 'cloud-rain', color: '#0284c7' },
    'pn': { label: 'Parcialmente Nublado', icon: 'cloud-sun', color: '#f59e0b' },
    'cv': { label: 'Chuvisco', icon: 'cloud-drizzle', color: '#38bdf8' },
    'ch': { label: 'Chuvoso', icon: 'cloud-rain', color: '#0284c7' },
    't':  { label: 'Tempestade', icon: 'zap', color: '#dc2626' },
    'ps': { label: 'Predomínio de Sol', icon: 'sun', color: '#f59e0b' },
    'e':  { label: 'Encoberto', icon: 'cloud', color: '#64748b' },
    'n':  { label: 'Nublado', icon: 'cloud', color: '#64748b' },
    'cl': { label: 'Céu Claro', icon: 'sun', color: '#f59e0b' },
    'nv': { label: 'Nevoeiro', icon: 'cloud-fog', color: '#94a3b8' },
    'g':  { label: 'Geada', icon: 'snowflake', color: '#38bdf8' },
    'ne': { label: 'Neve', icon: 'snowflake', color: '#e0f2fe' },
    'nd': { label: 'Não Definido', icon: 'help-circle', color: '#94a3b8' },
    'pnt': { label: 'Pancadas de Chuva a Noite', icon: 'cloud-rain', color: '#1e3a8a' },
    'psc': { label: 'Possibilidade de Chuva', icon: 'cloud-drizzle', color: '#38bdf8' },
    'pcm': { label: 'Possibilidade de Chuva pela Manhã', icon: 'cloud-drizzle', color: '#38bdf8' },
    'pct': { label: 'Possibilidade de Chuva a Tarde', icon: 'cloud-drizzle', color: '#38bdf8' },
    'pcn': { label: 'Possibilidade de Chuva a Noite', icon: 'cloud-drizzle', color: '#38bdf8' },
    'npt': { label: 'Nublado com Pancadas a Tarde', icon: 'cloud-rain', color: '#0284c7' },
    'npn': { label: 'Nublado com Pancadas a Noite', icon: 'cloud-rain', color: '#1e3a8a' },
    'ncn': { label: 'Nublado com Chuva a Noite', icon: 'cloud-rain', color: '#1e3a8a' },
    'nct': { label: 'Nublado com Chuva a Tarde', icon: 'cloud-rain', color: '#0284c7' },
    'ncm': { label: 'Nublado com Chuva pela Manhã', icon: 'cloud-rain', color: '#0284c7' },
    'npm': { label: 'Nublado com Pancadas pela Manhã', icon: 'cloud-rain', color: '#0284c7' },
    'npp': { label: 'Nublado com Possibilidade de Chuva', icon: 'cloud-drizzle', color: '#38bdf8' },
    'vn': { label: 'Variação de Nebulosidade', icon: 'cloud-sun', color: '#f59e0b' }
  }
};

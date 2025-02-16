// metro.config.js

const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  // Adicionamos alias para que 'undici' seja substituído
  // por um módulo vazio no web bundling
  config.resolver.alias = {
    ...config.resolver.alias,
    undici: require.resolve('./metroEmptyObject.js'), // <-- caminho do mock
  };

  // Se o make-plural estiver dando erro de extensão (algumas versões .cjs ou .mjs),
  // habilite a extensão adicional caso necessário:
  // config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs', 'mjs'];

  return config;
})();

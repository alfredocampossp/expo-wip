module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // Substitui expo-router/babel por babel-preset-expo
      'babel-preset-expo'
    ],
    plugins: [
      // Se você usa Reanimated, mantenha:
      'react-native-reanimated/plugin',

      // Se precisar transformar métodos privados:
      [
        '@babel/plugin-transform-private-methods',
        { loose: true }
      ]

      // Nada de "expo-router/babel" aqui
    ],
  };
};
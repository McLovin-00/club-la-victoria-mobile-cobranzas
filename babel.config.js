module.exports = function (api) {
  const isTest = api.env("test");
  api.cache(() => process.env.NODE_ENV);

  return {
    presets: [["babel-preset-expo", isTest ? {} : { jsxImportSource: "nativewind" }]],
    plugins: isTest ? [] : ["nativewind/babel"],
  };
};

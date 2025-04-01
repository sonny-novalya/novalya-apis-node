module.exports = {
  apps: [
    {
      name: 'NovalyaApp',
      script: 'server.js --watch', // Replace with the path to your application's entry point
      ignore_watch: ['logs/combined.log'],
    },
  ],
};

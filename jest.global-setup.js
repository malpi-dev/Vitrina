module.exports = async () => {
  process.env.TZ = 'UTC'; // domain logic must never depend on the machine timezone
};

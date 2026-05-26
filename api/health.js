module.exports = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    deployed: true,
    timestamp: new Date().toISOString(),
    version: '5.0',
    apis: {
      coupang: !!process.env.COUPANG_ACCESS_KEY,
      alibaba1688: !!process.env.ALIBABA_APP_KEY,
      scraperapi: !!process.env.SCRAPER_API_KEY
    }
  });
};

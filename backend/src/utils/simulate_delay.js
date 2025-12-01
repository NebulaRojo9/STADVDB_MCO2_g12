const simulateDelay = async (req) => {
  const delay = Number(req.query.delay || 0);
  if (delay > 0) {
    console.log(`Delaying for ${delay}ms`)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
}

export default simulateDelay
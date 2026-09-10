const calculatePrice = (pricePerDay, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const difference = end.getTime() - start.getTime();

  const numberOfDays = Math.ceil(difference / (1000 * 60 * 60 * 24));

  const days = Math.max(numberOfDays, 1);

  const totalAmount = days * pricePerDay;

  return {
    numberOfDays: days,
    totalAmount,
  };
};

export default calculatePrice;

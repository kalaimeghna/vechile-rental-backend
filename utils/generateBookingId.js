const generateBookingId = () => {
  const timestamp = Date.now();

  const random = Math.floor(1000 + Math.random() * 9000);

  return `VR-${timestamp}-${random}`;
};

export default generateBookingId;

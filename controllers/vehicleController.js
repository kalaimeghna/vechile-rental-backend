import Vehicle from "../models/Vehicle.js";

export const getVehicles = async (req, res) => {
  try {
    const {
      search,
      type,
      location,
      minPrice,
      maxPrice,
      fuelType,
      transmission,
    } = req.query;

    const filter = {
      isApproved: true,
    };

    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: search,
            $options: "i",
          },
        },
        {
          model: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    if (fuelType) {
      filter.fuelType = fuelType;
    }

    if (transmission) {
      filter.transmission = transmission;
    }

    if (minPrice || maxPrice) {
      filter.pricePerDay = {};

      if (minPrice) {
        filter.pricePerDay.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.pricePerDay.$lte = Number(maxPrice);
      }
    }

    const vehicles = await Vehicle.find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate(
      "owner",
      "name email phone",
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    res.json({
      success: true,
      vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const {
      name,
      brand,
      model,
      year,
      type,
      fuelType,
      transmission,
      seats,
      pricePerDay,
      location,
      description,
      features,
      images,
    } = req.body;

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      name,
      brand,
      model,
      year,
      type,
      fuelType,
      transmission,
      seats,
      pricePerDay,
      location,
      description,
      features: Array.isArray(features) ? features : [],
      images: Array.isArray(images) ? images : [],
      isApproved: true,
    });

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully.",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    if (
      vehicle.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized.",
      });
    }

    Object.assign(vehicle, req.body);

    await vehicle.save();

    res.json({
      success: true,
      message: "Vehicle updated successfully.",
      vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    if (
      vehicle.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized.",
      });
    }

    await vehicle.deleteOne();

    res.json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

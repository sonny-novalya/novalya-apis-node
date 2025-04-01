const { InstaSection, InstaSectionType, Sequelize } = require("../../Models");
const Op = Sequelize.Op;
let self = {};

const Section = InstaSection;
const SectionType = InstaSectionType;

self.getAllSections = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { page = 1, limit = null, orderBy = "desc" } = req.query;
    const offset = (page - 1) * limit;
    const whereOptions = user_id ? { user_id: user_id } : {};

    const fetchParams = {
      where: whereOptions,
      offset,
      limit: limit !== null ? parseInt(limit) : undefined,
      order: [["id", orderBy === "desc" ? "DESC" : "ASC"]],
      include: [
        {
          model: SectionType, // Include the SectionType model
          as: "sectionTypes",
          attributes: ["type"], // Specify the attributes you want to include
        },
      ],
    };

    const sections = await Section.findAll(fetchParams);
    res.status(200).json({ status: "success", data: sections });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while fetching sections.",
      });
  }
};

self.createSection = async (req, res) => {
  try {
    const user_id = req.authUser;
    const { section, varient, types } = req.body; // Destructure section and varient from request body

    const newSection = await Section.create({
      user_id,
      section,
      varient: varient, // Store parsed varient array
    });

    if (types && types.length > 0) {
      for (const type of types) {
        await SectionType.create({ section_id: newSection.id, type });
      }
    }

    res.status(201).json({ status: "success", data: newSection });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the section.",
        error: error.message,
      });
  }
};

self.duplicateSection = async (req, res) => {
  try {
    const user_id = req.authUser;
    const oldsection = await Section.findByPk(req.params.sectionID, {
      include: [
        {
          model: SectionType, // Include the SectionType model
          as: "sectionTypes",
          attributes: ["type"], // Specify the attributes you want to include
        },
      ],
    });
    if (!oldsection) {
      return res
        .status(404)
        .json({ status: "error", message: "Section not found" });
    }

    const newSection = await Section.create({
      user_id,
      section: oldsection.section + "copy",
      varient: JSON.parse(oldsection.varient), // Store parsed varient array
    });

    if (oldsection.sectionTypes && oldsection.sectionTypes.length > 0) {
      for (const type of oldsection.sectionTypes) {
        await SectionType.create({
          section_id: newSection.id,
          type: type.type,
        });
      }
    }

    res.status(201).json({ status: "success", data: newSection });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while creating the section.",
      });
  }
};

self.getSectionByID = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionID, {
      include: [
        {
          model: SectionType, // Include the SectionType model
          as: "sectionTypes",
          attributes: ["type"], // Specify the attributes you want to include
        },
      ],
    });
    if (!section) {
      return res
        .status(404)
        .json({ status: "error", message: "Section not found" });
    }
    res.status(200).json({ status: "success", data: section });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while getting the section.",
      });
  }
};

self.updateSection = async (req, res) => {
  try {
    const sectionID = req.params.sectionID;
    const { section, varient, types } = req.body;

    const existingSection = await Section.findByPk(sectionID, {
      include: [
        {
          model: SectionType, // Include the SectionType model
          as: "sectionTypes",
          attributes: ["type"], // Specify the attributes you want to include
        },
      ],
    });
    if (!existingSection) {
      return res
        .status(404)
        .json({ status: "error", message: "Section not found" });
    }

    // Update section attributes
    existingSection.section = section;
    existingSection.varient = varient;

    if (types && types.length > 0) {
      await SectionType.destroy({ where: { section_id: sectionID } }); // Delete existing types
      const typePromises = types.map(async (type) => {
        return SectionType.create({ section_id: sectionID, type });
      });

      await Promise.all(typePromises);
    }

    // Save the updated section
    await existingSection.save();

    res.status(200).json({ status: "success", data: existingSection });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while updating the section.",
      });
  }
};

self.deleteSection = async (req, res) => {
  try {
    const section = await Section.findByPk(req.params.sectionID);
    if (!section) {
      return res
        .status(404)
        .json({ status: "error", message: "Section not found" });
    }

    await section.destroy();
    res.status(200).json({ status: "success", message: "Section deleted" });
  } catch (error) {
    res
      .status(500)
      .json({
        status: "error",
        message: "An error occurred while deleting the section.",
      });
  }
};

module.exports = self;

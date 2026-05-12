const requestModel = require('../models/request');

const createRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, message, createdAt } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        message: 'Subject and message required'
      });
    }

    const id = await requestModel.createRequest(
      userId,
      subject,
      message,
      createdAt || new Date()
    );

    res.status(201).json({
      success: true,
      id,
      message: 'Request submitted successfully'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await requestModel.getMyRequests(userId);

    res.json({ requests });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { subject, message } = req.body;

    await requestModel.updateRequest(
      id,
      userId,
      subject,
      message
    );

    res.json({
      success: true,
      message: 'Request updated'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await requestModel.deleteRequest(id, userId);

    res.json({
      success: true,
      message: 'Request deleted'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllRequests = async (req, res) => {
  try {
    const requests = await requestModel.getAllRequests();

    console.log("ADMIN REQUESTS:", requests);

    res.json({ requests });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const adminDeleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    await requestModel.adminDeleteRequest(id);

    res.json({
      success: true,
      message: 'Request deleted'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  updateRequest,
  deleteRequest,
  getAllRequests,
  adminDeleteRequest
};
const jobService = require('../services/jobService');

const createJob = async (req, res) => {
  try {
    const { userId } = req.user;
    console.log('[JobController] Attempting to create job:', { userId, body: req.body });
    const jobData = { ...req.body, postedById: userId };
    const job = await jobService.createJob(jobData);
    console.log('[JobController] Job created successfully:', job);
    res.status(201).json(job);
  } catch (error) {
    console.error('[JobController] Error creating job:', error);
    res.status(500).json({ message: 'Error creating job', error: error.message });
  }
};

const getAllJobs = async (req, res) => {
  try {
    const jobs = await jobService.getAllJobs();
    res.json(jobs);
  } catch (error) {
    console.error('[JobController] Error fetching jobs:', error);
    res.status(500).json({ message: 'Error fetching jobs', error: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (error) {
    console.error('[JobController] Error fetching job:', error);
    res.status(500).json({ message: 'Error fetching job', error: error.message });
  }
};

const updateJob = async (req, res) => {
  try {
    console.log('[JobController] Attempting to update job:', { id: req.params.id, body: req.body });
    const job = await jobService.updateJob(req.params.id, req.body);
    console.log('[JobController] Job updated successfully:', job);
    res.json(job);
  } catch (error) {
    console.error('[JobController] Error updating job:', error);
    res.status(500).json({ message: 'Error updating job', error: error.message });
  }
};

module.exports = { createJob, getAllJobs, getJobById, updateJob }; 
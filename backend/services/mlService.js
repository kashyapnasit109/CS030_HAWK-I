const FormData = require('form-data');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function fetchFromMLService(endpoint, formData) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`ML service error (${response.status}): ${errorBody}`);
  }

  return await response.json();
}

exports.callAnpr = async (fileBuffer, filename, mimetype) => {
  const formData = new FormData();
  formData.append('file', fileBuffer, { filename, contentType: mimetype });
  return fetchFromMLService('/detect/anpr', formData);
};

exports.callVelocity = async (fileBuffer, filename, mimetype, params) => {
  const formData = new FormData();
  formData.append('file', fileBuffer, { filename, contentType: mimetype });
  formData.append('x1', params.x1);
  formData.append('y1', params.y1);
  formData.append('x2', params.x2);
  formData.append('y2', params.y2);
  formData.append('distance_meters', params.distance_meters);
  return fetchFromMLService('/detect/velocity', formData);
};

exports.callMisplacement = async (refBuffer, refName, refMime, currBuffer, currName, currMime) => {
  const formData = new FormData();
  formData.append('reference_file', refBuffer, { filename: refName, contentType: refMime });
  formData.append('current_file', currBuffer, { filename: currName, contentType: currMime });
  return fetchFromMLService('/detect/misplacement', formData);
};

exports.callThreat = async (fileBuffer, filename, mimetype, ruleParameters) => {
  const formData = new FormData();
  formData.append('file', fileBuffer, { filename, contentType: mimetype });
  formData.append('rule_parameters', ruleParameters);
  return fetchFromMLService('/detect/threat', formData);
};

exports.callEntry = async (entryBuffer, entryName, entryMime, interiorBuffer, interiorName, interiorMime, params) => {
  const formData = new FormData();
  formData.append('entry_gate', entryBuffer, { filename: entryName, contentType: entryMime });
  formData.append('interior', interiorBuffer, { filename: interiorName, contentType: interiorMime });
  
  if (params.time_window_minutes) formData.append('time_window_minutes', params.time_window_minutes);
  if (params.entry_gate_start_time) formData.append('entry_gate_start_time', params.entry_gate_start_time);
  if (params.interior_start_time) formData.append('interior_start_time', params.interior_start_time);

  return fetchFromMLService('/detect/entry', formData);
};

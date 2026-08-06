exports.generateDescription = (cameraName, zoneType, detectedAt, moduleType, objectType, metadata) => {
  const timeStr = new Date(detectedAt).toLocaleString();
  let baseDesc = `${objectType} detected at ${cameraName} (${zoneType} zone) on ${timeStr}.`;

  try {
    if (moduleType === 'vehicle') {
      if (metadata.plate_text) {
        const matchStatus = metadata.registry_match ? 'registered' : 'unregistered';
        baseDesc = `${matchStatus} vehicle detected at ${cameraName} (${zoneType} zone) on ${timeStr}. License plate: ${metadata.plate_text}.`;
      }
      
      if (metadata.tracked_objects && metadata.tracked_objects.length > 0) {
        const speed = metadata.tracked_objects[0].max_speed_kmh;
        if (speed) {
          baseDesc += ` Vehicle was travelling at a maximum speed of ${Math.round(speed)} km/h.`;
        }
      }
    } 
    else if (moduleType === 'object') {
      if (metadata.differences && metadata.differences.length > 0) {
        const missingCount = metadata.differences.filter(d => d.change_type === 'missing_object').length;
        const newCount = metadata.differences.filter(d => d.change_type === 'new_object').length;
        
        let actions = [];
        if (missingCount > 0) actions.push(`${missingCount} object(s) went missing`);
        if (newCount > 0) actions.push(`${newCount} new object(s) appeared`);
        
        baseDesc = `Object misplacement event at ${cameraName} (${zoneType} zone) on ${timeStr}. ${actions.join(' and ')}.`;
      }
    }
    else if (moduleType === 'loitering' || moduleType === 'intrusion') {
      if (metadata.anomalies && metadata.anomalies.length > 0) {
        const rules = metadata.anomalies[0].triggered_rules || [];
        const expl = metadata.anomalies[0].explanation || 'Suspicious behavior detected.';
        baseDesc = `Threat or anomaly detected involving a ${objectType} at ${cameraName} (${zoneType} zone) on ${timeStr}. Triggered rules: ${rules.join(', ')}. Details: ${expl}`;
      } 
      else if (metadata.flagged_entries) {
        const count = metadata.flagged_entries.length;
        if (count > 0) {
          baseDesc = `Unauthorized entry flagged at ${cameraName} (${zoneType} zone) on ${timeStr}. ${count} unmatched person(s) entered the premises without passing the entry gate.`;
        } else {
          baseDesc = `Person detected at ${cameraName} (${zoneType} zone) on ${timeStr}. Correlated successfully with entry gate.`;
        }
      }
    }
  } catch (err) {
    console.error('Error generating description:', err);
  }

  return baseDesc;
};

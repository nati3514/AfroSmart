/**
 * Picks specific properties from an object
 * @param {Object} object - The source object
 * @param {string[]} keys - The keys to pick
 * @returns {Object} A new object with only the picked properties
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      // eslint-disable-next-line no-param-reassign
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

export default pick;

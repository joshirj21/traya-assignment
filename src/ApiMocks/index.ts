import userResponses from './userResponses.json';
import metricResponses from './metricResponses.json';

export { userResponses, metricResponses };
export type MockResponseKey = keyof typeof userResponses;
export type MockMetricResponseKey = keyof typeof metricResponses;

export default userResponses;

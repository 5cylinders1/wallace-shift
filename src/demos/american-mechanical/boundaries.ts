// Simplified metro geography based on U.S. Census boundaries.
type Point = [number, number]
const coordinates = (line: string): Point[] => line.split(' ').map(point => point.split(',').map(Number) as Point)
export const missouriRiver = coordinates('39.615,-95.07 39.574,-95.107 39.542,-95.109 39.419,-94.969 39.367,-94.91 39.302,-94.901 39.227,-94.832 39.169,-94.737 39.16,-94.602 39.14,-94.59 39.113,-94.607 39.149,-94.523 39.12,-94.462 39.194,-94.39 39.183,-94.335 39.237,-94.29 39.207,-94.213 39.144,-94.105 39.153,-93.989 39.215,-93.84 39.207,-93.758');
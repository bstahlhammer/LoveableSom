// Module-level store keeps scroll positions across React unmount/remount cycles.
const positions = new Map()
export const saveScroll = (key, y) => positions.set(key, y)
export const getScroll  = (key) => positions.get(key) ?? 0

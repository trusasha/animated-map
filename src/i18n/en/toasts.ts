export const toasts = {
  routeReplaced: {
    one: 'Route replaced with {count} stop. Suggested name: “{name}”.',
    other: 'Route replaced with {count} stops. Suggested name: “{name}”.',
  },
  rangeReset: 'Video range reset to the whole route.',
  routeNotFound: 'Couldn’t find a route in that. Name the places in the order you visited them.',
  geocodeFailed: 'Couldn’t name this spot, so it keeps the name “{name}”.',
  colorApplied: {
    one: 'Color applied to {count} segment.',
    other: 'Color applied to all {count} segments.',
  },
  figureGenerating: '“{name}” is generating. It updates by itself in about 2 minutes.',
  figureUpdated: 'Figure updated everywhere it is used.',
  figureDeleted: 'Figure deleted.',
  tripDeleted: 'Trip deleted.',
  saveFailed: 'Couldn’t save your changes. Check your connection.',
  genericError: 'Something went wrong. Try again.',
};

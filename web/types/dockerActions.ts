export const DOCKER_ACTIONS = {
  CREATE: 'create',
  START: 'start',
  STOP: 'stop',
  RESTART: 'restart',
  DELETE: 'delete',
} as const;

// Generates the union type: 'create' | 'start' | 'stop' | 'restart' | 'delete'
export type DockerAction = typeof DOCKER_ACTIONS[keyof typeof DOCKER_ACTIONS];

const VALID_DOCKER_ACTIONS: DockerAction[] = [
  DOCKER_ACTIONS.CREATE,
  DOCKER_ACTIONS.START,
  DOCKER_ACTIONS.STOP,
  DOCKER_ACTIONS.RESTART,
  DOCKER_ACTIONS.DELETE,
];

/**
 * Returns true if the provided action is NOT a valid Docker action.
 */
export function isInvalidDockerAction(action: unknown): action is false {
  return !VALID_DOCKER_ACTIONS.includes(action as DockerAction);
}

/**
 * Returns a comma-separated string of valid actions for error messages.
 */
export function getValidActionsList(): string {
  return VALID_DOCKER_ACTIONS.join(', ');
}
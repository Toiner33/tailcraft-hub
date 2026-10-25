'use client';

import { Button } from '@/components/ui/button';
import { StatusBanner } from '@/components/shared/StatusBanner';
import { DOCKER_ACTIONS, type DockerAction } from '@/types/dockerActions';

interface ServerActionButtonsProps {
  containerExists: boolean;
  isRunning: boolean;
  outOfSync: boolean;
  actionPending: boolean;
  onAction: (action: DockerAction) => void;
  onRecreate: () => void;
}

/** Shows the buttons that make sense for the container's current state. */
export function ServerActionButtons({
  containerExists,
  isRunning,
  outOfSync,
  actionPending,
  onAction,
  onRecreate,
}: ServerActionButtonsProps) {
  if (!containerExists) {
    return (
      <Button
        className="w-full"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.CREATE)}
      >
        Create Server
      </Button>
    );
  }

  // The profile changed after the container was created: offer to recreate it.
  if (outOfSync) {
    return (
      <div className="space-y-2">
        <StatusBanner variant="warning" className="text-center">
          ⚠️ Server parameters have changed. Recreate container to apply updates.
        </StatusBanner>
        <div className="flex gap-2">
          <Button variant="warning" className="flex-1" disabled={actionPending} onClick={onRecreate}>
            Recreate Container
          </Button>
          <Button
            variant="destructive"
            disabled={actionPending}
            onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }

  if (!isRunning) {
    return (
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={actionPending}
          onClick={() => onAction(DOCKER_ACTIONS.START)}
        >
          Start
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          disabled={actionPending}
          onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
        >
          Delete
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        variant="destructive"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.STOP)}
      >
        Stop
      </Button>
      <Button
        variant="secondary"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.RESTART)}
      >
        Restart
      </Button>
      <Button
        variant="destructive"
        disabled={actionPending}
        onClick={() => onAction(DOCKER_ACTIONS.DELETE)}
      >
        Delete
      </Button>
    </div>
  );
}

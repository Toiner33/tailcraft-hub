import Docker from 'dockerode';

// Initialize Docker client connecting to the system Docker socket
const docker = new Docker({
  socketPath: process.platform === 'win32' 
    ? '//./pipe/docker_engine' 
    : '/var/run/docker.sock'
});

/**
 * Returns the Docker container instance associated with a given server ID.
 */
export async function getContainerByServerId(serverId: string) {
  return docker.getContainer(serverId);
}

export default docker;

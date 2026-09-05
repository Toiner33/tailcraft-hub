import Docker from 'dockerode';

// Initialize Docker client connecting to the system Docker socket
const docker = new Docker({
  socketPath: process.platform === 'win32' 
    ? '//./pipe/docker_engine' 
    : '/var/run/docker.sock'
});

export default docker;

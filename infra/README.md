# Infrastructure Guide

This directory contains the container, Kubernetes, and Argo CD configuration required to deploy the Task Management application to DigitalOcean Kubernetes (DOKS).

## 1. Build & Push Images

1. **Authenticate** with the DigitalOcean container registry (replace `$REGISTRY`):
   ```bash
   doctl registry login
   export REGISTRY=registry.digitalocean.com/your-registry
   ```
2. **Backend**:
   ```bash
   docker build -f backend/Dockerfile -t $REGISTRY/task-backend:latest .
   docker push $REGISTRY/task-backend:latest
   ```
3. **Frontend** (provide the API endpoint that the SPA should call):
   ```bash
   docker build \
     --build-arg VITE_API_URL=https://api.example.com \
     -f frontend/Dockerfile \
     -t $REGISTRY/task-frontend:latest \
     frontend
   docker push $REGISTRY/task-frontend:latest
   ```

## 2. Configure Kubernetes Secrets

Copy the secret template and fill in production values:
```bash
kubectl apply -n task-management -f infra/k8s/base/backend-secret.yaml
```
*(It is recommended to manage the real secret outside of Git — e.g. `kubectl create secret generic backend-secrets ...`.)*

## 3. Deploy with Kustomize (manual option)

```bash
kubectl apply -k infra/k8s/overlays/production
```
Update `ingress.yaml` with your own domains and TLS annotations before applying. Ensure an ingress controller (e.g. `doctl kubernetes cluster addons install ingress-nginx`) is available.

## 4. Deploy with Argo CD

1. Install Argo CD in your DOKS cluster (if not already present).
2. Update `infra/argocd/task-management-app.yaml` with your repository URL and registry paths.
3. Apply the application definition:
   ```bash
   kubectl apply -f infra/argocd/task-management-app.yaml
   ```
4. Argo CD will create/update all Kubernetes resources under `infra/k8s/overlays/production`.

## 5. DigitalOcean Specific Notes

- Create a DO container registry and grant your cluster read access:
  ```bash
  doctl registry kube-auth
  ```
- Provision a managed PostgreSQL database and update `backend-secret.yaml` with the connection string.
- Update `ingress.yaml` hosts and optionally add annotations such as `kubernetes.digitalocean.com/load-balancer-id` or TLS configuration via cert-manager.

## 6. Directory Overview

- `backend/Dockerfile` – Node.js API container definition.
- `frontend/Dockerfile` – Vite/React build served by nginx.
- `infra/docker/frontend.nginx.conf` – nginx SPA config.
- `infra/k8s/base` – Base manifests shared by all environments.
- `infra/k8s/overlays/production` – Production-specific configuration (images, ingress).
- `infra/argocd/task-management-app.yaml` – Argo CD Application manifest.

Adjust replicas, resources, and probes as you refine the deployment.

# Deployment Guide for Google Cloud

This guide covers deploying the Sober Solutions App to Google Cloud Platform.

## Prerequisites

- Google Cloud Project created
- `gcloud` CLI installed and authenticated
- Billing enabled on your project

## Configuration

### 1. Set Your API Key in Google Cloud Build

You need to configure the Gemini API key as a substitution variable in Google Cloud Build.

**Option A: Via Cloud Build Trigger (Recommended)**

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Create or edit your trigger
3. Under "Substitution variables", add:
   - Variable: `_API_KEY`
   - Value: `AIzaSyBDMaiAIiikVhW_WN6uVEU-y_lGw4641a0`

**Option B: Via Command Line**

```bash
gcloud builds submit --substitutions=_API_KEY="AIzaSyBDMaiAIiikVhW_WN6uVEU-y_lGw4641a0"
```

**Option C: Using Secret Manager (Most Secure)**

1. Store your API key in Secret Manager:
```bash
echo -n "AIzaSyBDMaiAIiikVhW_WN6uVEU-y_lGw4641a0" | gcloud secrets create gemini-api-key --data-file=-
```

2. Update `cloudbuild.yaml` to use the secret:
```yaml
availableSecrets:
  secretManager:
  - versionName: projects/$PROJECT_ID/secrets/gemini-api-key/versions/latest
    env: 'API_KEY'

steps:
  - name: 'gcr.io/cloud-builders/docker'
    secretEnv: ['API_KEY']
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_API_KEY=$$API_KEY'
      # ... rest of args
```

## Deployment Options

### Option 1: Cloud Run (Recommended)

Cloud Run is serverless and scales automatically.

1. **Enable Cloud Run API:**
```bash
gcloud services enable run.googleapis.com
```

2. **Deploy using cloudbuild.yaml:**

Uncomment the Cloud Run deployment step in `cloudbuild.yaml` (lines 23-37).

3. **Submit the build:**
```bash
gcloud builds submit --substitutions=_API_KEY="AIzaSyBDMaiAIiikVhW_WN6uVEU-y_lGw4641a0"
```

4. **Access your app:**
The deployment will output a URL like: `https://sober-solutions-app-xxxxx-uc.a.run.app`

### Option 2: App Engine

1. **Create `app.yaml`:**
```yaml
runtime: custom
env: flex
```

2. **Deploy:**
```bash
gcloud app deploy
```

### Option 3: Kubernetes (GKE)

1. **Build and push the image:**
```bash
gcloud builds submit
```

2. **Create Kubernetes deployment:**
```bash
kubectl create deployment sober-solutions --image=gcr.io/$PROJECT_ID/sober-solutions-app:latest
kubectl expose deployment sober-solutions --type=LoadBalancer --port=80 --target-port=8080
```

## Local Docker Testing

Test the Docker build locally before deploying:

```bash
# Build with API key
docker build --build-arg VITE_API_KEY="AIzaSyBDMaiAIiikVhW_WN6uVEU-y_lGw4641a0" -t sober-solutions-app .

# Run locally
docker run -p 8080:8080 sober-solutions-app

# Open http://localhost:8080
```

## Troubleshooting

### Build fails with "no such file or directory: Dockerfile"

- Ensure you're in the correct directory
- Verify `Dockerfile` exists in the root of your repository
- Check that your build is using the latest commit

### Build succeeds but app shows errors

- Verify the API key is correctly passed via `--build-arg`
- Check Cloud Build logs for environment variable values
- Ensure the API key is valid and has necessary permissions

### Port issues

- Google Cloud Run expects port 8080 (already configured in nginx.conf)
- App Engine Flex also uses port 8080 by default

## Environment Variables

The following environment variables are used:

- `API_KEY` - Google Gemini API key (embedded at build time)

## Security Notes

- The API key is embedded in the client-side JavaScript bundle
- Consider implementing backend API proxy for production
- Restrict API key to specific domains in Google Cloud Console
- Use Secret Manager for sensitive values in CI/CD

## Cost Optimization

- Cloud Run: Only pay when requests are being handled
- Use `gcloud run services update --min-instances=0` to scale to zero
- Container Registry: Clean up old images periodically

## Support

For issues, check:
- [Google Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- Application logs in Cloud Logging

#!/bin/bash

# TubeConv Docker Hub Push Script
# Usage: ./docker-push.sh [version]

set -e

# Configuration
DOCKER_USERNAME="fabriziosalmi"
IMAGE_NAME="tubeconv"
VERSION=${1:-"latest"}

echo "🐳 Building and pushing TubeConv to Docker Hub..."

# Login to Docker Hub
echo "📝 Logging in to Docker Hub..."
docker login

# Build the image
echo "🔨 Building Docker image..."
docker build -t $DOCKER_USERNAME/$IMAGE_NAME:$VERSION .

# Tag as latest if version is provided
if [ "$VERSION" != "latest" ]; then
    docker tag $DOCKER_USERNAME/$IMAGE_NAME:$VERSION $DOCKER_USERNAME/$IMAGE_NAME:latest
fi

# Push to Docker Hub
echo "📤 Pushing to Docker Hub..."
docker push $DOCKER_USERNAME/$IMAGE_NAME:$VERSION

if [ "$VERSION" != "latest" ]; then
    docker push $DOCKER_USERNAME/$IMAGE_NAME:latest
fi

echo "✅ Successfully pushed $DOCKER_USERNAME/$IMAGE_NAME:$VERSION to Docker Hub!"
echo "🔗 Available at: https://hub.docker.com/r/$DOCKER_USERNAME/$IMAGE_NAME"

# Clean up local images (optional)
read -p "🗑️  Remove local images to save space? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rmi $DOCKER_USERNAME/$IMAGE_NAME:$VERSION
    if [ "$VERSION" != "latest" ]; then
        docker rmi $DOCKER_USERNAME/$IMAGE_NAME:latest
    fi
    echo "🧹 Local images cleaned up!"
fi

echo "🎉 Done! Users can now run:"
echo "   docker run -p 3000:3000 $DOCKER_USERNAME/$IMAGE_NAME:$VERSION"

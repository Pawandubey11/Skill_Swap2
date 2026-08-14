pipeline {
    agent any

    stages {

        // =====================================================
        // BUILD DOCKER IMAGE
        // =====================================================

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "Building Docker Image"
                    echo "======================================"

                    docker build --no-cache \
                        -t my-node-app:latest .

                    echo "Docker image built successfully"
                '''
            }
        }


        // =====================================================
        // STOP OLD CONTAINER + RUN NEW CONTAINER
        // =====================================================

        stage('Run Container') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "Removing old container"
                    echo "======================================"

                    docker rm -f my-node-app || true


                    echo "======================================"
                    echo "Starting new container"
                    echo "======================================"

                    docker run -d \
                        --name my-node-app \
                        -p 3000:3000 \
                        --env-file .env \
                        my-node-app:latest


                    echo "Container started"

                    docker ps -a \
                        --filter "name=my-node-app"
                '''
            }
        }


        // =====================================================
        // HEALTH CHECK
        // =====================================================

        stage('Health Check') {
            steps {
                sh '''
                    echo "======================================"
                    echo "Waiting for application..."
                    echo "======================================"

                    sleep 5


                    echo "Checking container status..."

                    docker ps -a \
                        --filter "name=my-node-app"


                    echo "======================================"
                    echo "Checking application health"
                    echo "======================================"

                    if curl --fail --silent --show-error \
                        http://localhost:3000/health
                    then

                        echo "======================================"
                        echo "Application is healthy"
                        echo "======================================"

                    else

                        echo "======================================"
                        echo "APPLICATION HEALTH CHECK FAILED"
                        echo "======================================"

                        echo ""
                        echo "Container status:"
                        docker ps -a \
                            --filter "name=my-node-app"

                        echo ""
                        echo "Container logs:"
                        docker logs --tail 200 my-node-app || true

                        echo ""
                        echo "Container inspect:"
                        docker inspect my-node-app \
                            --format='Status={{.State.Status}} ExitCode={{.State.ExitCode}} Error={{.State.Error}}' \
                            || true

                        exit 1
                    fi
                '''
            }
        }
    }


    // =========================================================
    // POST ACTIONS
    // =========================================================

    post {

        success {
            echo '''
========================================
 Jenkins Pipeline SUCCESS
========================================
Application:
http://localhost:3000

Container:
my-node-app
========================================
'''
        }

        failure {
            echo '''
========================================
 Jenkins Pipeline FAILED
========================================
Check the Docker logs above.
========================================
'''
        }
    }
}

"""
Download OpenCV face detector files for liveness detection
"""

import os
import urllib.request
import zipfile
import shutil

def download_file(url, filename):
    """Download a file from URL"""
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"✅ Downloaded {filename}")
        return True
    except Exception as e:
        print(f"❌ Error downloading {filename}: {e}")
        return False

def setup_face_detector():
    """Setup OpenCV face detector files"""
    print("🔧 Setting up OpenCV face detector...")
    
    # Create models directory
    models_dir = "models/face_detector"
    os.makedirs(models_dir, exist_ok=True)
    
    # URLs for OpenCV face detector files
    files = {
        "deploy.prototxt": "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
        "res10_300x300_ssd_iter_140000.caffemodel": "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/opencv_face_detector_uint8.pb"
    }
    
    # Alternative URLs if the above don't work
    alternative_files = {
        "deploy.prototxt": "https://github.com/opencv/opencv/raw/4.x/samples/dnn/face_detector/deploy.prototxt",
        "res10_300x300_ssd_iter_140000.caffemodel": "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/opencv_face_detector_uint8.pb"
    }
    
    success_count = 0
    
    for filename, url in files.items():
        filepath = os.path.join(models_dir, filename)
        
        if os.path.exists(filepath):
            print(f"✅ {filename} already exists")
            success_count += 1
            continue
            
        # Try primary URL
        if download_file(url, filepath):
            success_count += 1
        else:
            # Try alternative URL
            alt_url = alternative_files.get(filename, url)
            if alt_url != url:
                print(f"Trying alternative URL for {filename}...")
                if download_file(alt_url, filepath):
                    success_count += 1
    
    if success_count == len(files):
        print("✅ All face detector files downloaded successfully!")
        print(f"📁 Files saved to: {os.path.abspath(models_dir)}")
        return True
    else:
        print(f"⚠️ Only {success_count}/{len(files)} files downloaded successfully")
        print("You may need to download the files manually:")
        print("1. deploy.prototxt - OpenCV face detector configuration")
        print("2. res10_300x300_ssd_iter_140000.caffemodel - Pre-trained model weights")
        return False

def create_sample_training_data():
    """Create sample training data for liveness detection"""
    print("📊 Creating sample training data...")
    
    import numpy as np
    import cv2
    
    # Create directories
    real_dir = "data/training/real"
    fake_dir = "data/training/fake"
    os.makedirs(real_dir, exist_ok=True)
    os.makedirs(fake_dir, exist_ok=True)
    
    # Generate synthetic real faces
    for i in range(50):
        # Create a more realistic face-like image
        face = np.random.rand(32, 32, 3).astype(np.float32)
        
        # Add face-like structure
        # Eyes
        face[8:12, 8:12] += 0.3
        face[8:12, 20:24] += 0.3
        
        # Nose
        face[12:18, 14:18] += 0.2
        
        # Mouth
        face[20:24, 10:22] += 0.1
        
        # Normalize
        face = np.clip(face, 0, 1)
        face = (face * 255).astype(np.uint8)
        
        cv2.imwrite(f"{real_dir}/real_{i:03d}.png", face)
    
    # Generate synthetic fake faces
    for i in range(50):
        # Create more random, less structured images
        face = np.random.rand(32, 32, 3).astype(np.float32)
        face += np.random.normal(0, 0.1, face.shape)
        face = np.clip(face, 0, 1)
        face = (face * 255).astype(np.uint8)
        
        cv2.imwrite(f"{fake_dir}/fake_{i:03d}.png", face)
    
    print("✅ Sample training data created!")
    print(f"📁 Real faces: {os.path.abspath(real_dir)}")
    print(f"📁 Fake faces: {os.path.abspath(fake_dir)}")

def main():
    """Main setup function"""
    print("🚀 Setting up OpenCV + TensorFlow liveness detection...")
    
    # Setup face detector
    detector_success = setup_face_detector()
    
    # Create sample training data
    create_sample_training_data()
    
    if detector_success:
        print("\n✅ Setup complete! You can now run the liveness detection system.")
        print("\nTo test the system:")
        print("1. Run: python server/liveness_model.py")
        print("2. Or integrate with your backend API")
    else:
        print("\n⚠️ Setup partially complete. Some files may need manual download.")
        print("Check the models/face_detector directory for missing files.")

if __name__ == "__main__":
    main()

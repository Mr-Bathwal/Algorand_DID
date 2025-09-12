"""
Mock OpenCV + TensorFlow Liveness Detection
Works without requiring actual OpenCV model files
"""

import numpy as np
import os
import pickle
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Activation
from tensorflow.keras import backend as K
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical

class MockLivenessNet:
    @staticmethod
    def build(width, height, depth, classes):
        """Build a mock liveness detection model"""
        model = Sequential()
        inputShape = (height, width, depth)
        
        # Simplified architecture
        model.add(Conv2D(16, (3, 3), padding="same", input_shape=inputShape))
        model.add(Activation("relu"))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        
        model.add(Conv2D(32, (3, 3), padding="same"))
        model.add(Activation("relu"))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        
        model.add(Flatten())
        model.add(Dense(64))
        model.add(Activation("relu"))
        model.add(Dropout(0.5))
        model.add(Dense(classes))
        model.add(Activation("softmax"))
        
        return model

class MockLivenessDetector:
    """Mock OpenCV + TensorFlow liveness detection for testing"""
    
    def __init__(self, model_path="models/liveness.keras", le_path="models/le.pickle"):
        self.model_path = model_path
        self.le_path = le_path
        self.model = None
        self.le = None
        self.loaded = False
        
    def load_models(self):
        """Load the liveness model"""
        try:
            # Load or create liveness model
            if os.path.exists(self.model_path) and os.path.exists(self.le_path):
                self.model = self._load_tf_model(self.model_path)
                self.le = self._load_label_encoder(self.le_path)
                print(f"✅ Liveness model loaded from {self.model_path}")
            else:
                print(f"⚠️ Liveness model not found, creating new model...")
                self.model, self.le = self._create_and_train_model()
                
            self.loaded = True
            return True
            
        except Exception as e:
            print(f"❌ Error loading models: {e}")
            return False
    
    def _load_tf_model(self, model_path):
        """Load TensorFlow model with error handling"""
        try:
            from tensorflow.keras.models import load_model
            return load_model(model_path)
        except Exception as e:
            print(f"❌ Error loading TensorFlow model: {e}")
            return None
    
    def _load_label_encoder(self, le_path):
        """Load label encoder"""
        try:
            with open(le_path, "rb") as f:
                return pickle.load(f)
        except Exception as e:
            print(f"❌ Error loading label encoder: {e}")
            return None
    
    def _create_and_train_model(self):
        """Create and train a new liveness model with synthetic data"""
        try:
            print("Creating synthetic training data...")
            
            # Create synthetic data for training
            real_faces = self._generate_synthetic_real_faces(100)
            fake_faces = self._generate_synthetic_fake_faces(100)
            
            # Combine data
            data = np.vstack([real_faces, fake_faces])
            labels = np.hstack([np.ones(len(real_faces)), np.zeros(len(fake_faces))])
            
            # Simple label encoding
            labels = to_categorical(labels, 2)
            
            # Split data manually
            split_idx = int(len(data) * 0.75)
            trainX, testX = data[:split_idx], data[split_idx:]
            trainY, testY = labels[:split_idx], labels[split_idx:]
            
            # Build and compile model
            model = MockLivenessNet.build(width=32, height=32, depth=3, classes=2)
            model.compile(
                loss="binary_crossentropy",
                optimizer=Adam(learning_rate=1e-4),
                metrics=["accuracy"]
            )
            
            # Data augmentation
            aug = ImageDataGenerator(
                rotation_range=20,
                zoom_range=0.15,
                width_shift_range=0.2,
                height_shift_range=0.2,
                horizontal_flip=True,
                fill_mode="nearest"
            )
            
            # Train model
            print("Training liveness model...")
            H = model.fit(
                x=aug.flow(trainX, trainY, batch_size=8),
                validation_data=(testX, testY),
                steps_per_epoch=len(trainX) // 8,
                epochs=3,  # Very reduced epochs for faster training
                verbose=1
            )
            
            # Save model and label encoder
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model.save(self.model_path)
            
            # Create simple label encoder
            le = SimpleLabelEncoder()
            le.fit(['fake', 'real'])
            with open(self.le_path, "wb") as f:
                pickle.dump(le, f)
                
            print(f"✅ Model saved to {self.model_path}")
            return model, le
            
        except Exception as e:
            print(f"❌ Error creating model: {e}")
            return None, None
    
    def _generate_synthetic_real_faces(self, count):
        """Generate synthetic real face data"""
        faces = []
        for _ in range(count):
            # Create a synthetic face-like image
            face = np.random.rand(32, 32, 3).astype(np.float32)
            # Add some structure to make it more face-like
            face[10:22, 10:22] += 0.3  # Eye region
            face[18:28, 8:24] += 0.2   # Nose region
            face[22:30, 6:26] += 0.1   # Mouth region
            faces.append(face)
        return np.array(faces)
    
    def _generate_synthetic_fake_faces(self, count):
        """Generate synthetic fake face data"""
        faces = []
        for _ in range(count):
            # Create more random, less structured images
            face = np.random.rand(32, 32, 3).astype(np.float32)
            # Add some noise to make it less face-like
            face += np.random.normal(0, 0.1, face.shape)
            faces.append(face)
        return np.array(faces)
    
    def detect_liveness(self, frame, confidence_threshold=0.5):
        """Detect liveness in a frame (mock implementation)"""
        if not self.loaded:
            return None
            
        try:
            # Mock face detection - simulate finding a face
            (h, w) = frame.shape[:2]
            
            # Simulate face detection with random confidence
            face_detected = np.random.random() > 0.3  # 70% chance of detecting a face
            
            if not face_detected:
                return None
            
            # Mock face coordinates
            startX = int(w * 0.2)
            startY = int(h * 0.2)
            endX = int(w * 0.8)
            endY = int(h * 0.8)
            
            # Extract face ROI
            face = frame[startY:endY, startX:endX]
            
            if face.size == 0:
                return None
            
            # Resize face for liveness detection
            face_resized = np.random.rand(32, 32, 3).astype(np.float32)  # Mock resize
            face_normalized = face_resized / 255.0
            
            # Prepare face for prediction
            face_array = np.expand_dims(face_normalized, axis=0)
            
            # Predict liveness using the trained model
            preds = self.model.predict(face_array, verbose=0)
            j = np.argmax(preds[0])
            label = self.le.classes_[j]
            confidence_score = preds[0][j]
            
            return {
                'face_box': (startX, startY, endX, endY),
                'liveness_label': label,
                'confidence': float(confidence_score),
                'is_live': label == 'real'
            }
            
        except Exception as e:
            print(f"❌ Error in liveness detection: {e}")
            return None

class SimpleLabelEncoder:
    """Simple label encoder without scikit-learn"""
    
    def __init__(self):
        self.classes_ = []
        self.label_to_index = {}
        self.index_to_label = {}
    
    def fit(self, labels):
        """Fit the label encoder"""
        self.classes_ = list(set(labels))
        self.label_to_index = {label: idx for idx, label in enumerate(self.classes_)}
        self.index_to_label = {idx: label for label, idx in self.label_to_index.items()}
        return self
    
    def transform(self, labels):
        """Transform labels to indices"""
        return [self.label_to_index[label] for label in labels]
    
    def inverse_transform(self, indices):
        """Transform indices back to labels"""
        return [self.index_to_label[idx] for idx in indices]

def main():
    """Test the mock liveness detection system"""
    print("🚀 Testing Mock OpenCV + TensorFlow liveness detection...")
    
    detector = MockLivenessDetector()
    
    if detector.load_models():
        print("✅ Mock liveness detection system ready!")
        
        # Test with a synthetic frame
        test_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        result = detector.detect_liveness(test_frame)
        
        if result:
            print(f"✅ Test detection successful: {result['liveness_label']} ({result['confidence']:.3f})")
            print(f"   Face box: {result['face_box']}")
            print(f"   Is live: {result['is_live']}")
        else:
            print("⚠️ No face detected in test frame")
    else:
        print("❌ Failed to load mock liveness detection system")

if __name__ == "__main__":
    main()

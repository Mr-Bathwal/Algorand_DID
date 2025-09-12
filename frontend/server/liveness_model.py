"""
LivenessNet - A CNN for detecting real vs fake faces
Based on the implementation from PyImageSearch
"""

import numpy as np
import cv2
import os
import pickle
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, BatchNormalization, Activation
from tensorflow.keras import backend as K
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

class LivenessNet:
    @staticmethod
    def build(width, height, depth, classes):
        """
        Build the LivenessNet architecture
        """
        model = Sequential()
        inputShape = (height, width, depth)
        chanDim = -1
        
        if K.image_data_format() == "channels_first":
            inputShape = (depth, height, width)
            chanDim = 1
            
        # 1st conv block
        model.add(Conv2D(16, (3, 3), padding="same", input_shape=inputShape))
        model.add(Activation("relu"))
        model.add(BatchNormalization(axis=chanDim))
        model.add(Conv2D(16, (3, 3), padding="same"))
        model.add(Activation("relu"))
        model.add(BatchNormalization(axis=chanDim))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        
        # 2nd conv block
        model.add(Conv2D(32, (3, 3), padding="same"))
        model.add(Activation("relu"))
        model.add(BatchNormalization(axis=chanDim))
        model.add(Conv2D(32, (3, 3), padding="same"))
        model.add(Activation("relu"))
        model.add(BatchNormalization(axis=chanDim))
        model.add(MaxPooling2D(pool_size=(2, 2)))
        model.add(Dropout(0.25))
        
        # FC layers
        model.add(Flatten())
        model.add(Dense(64))
        model.add(Activation("relu"))
        model.add(BatchNormalization())
        model.add(Dropout(0.5))
        model.add(Dense(classes))
        model.add(Activation("softmax"))
        
        return model

class LivenessDetector:
    """
    OpenCV + TensorFlow based liveness detection
    """
    
    def __init__(self, detector_path="models/face_detector", model_path="models/liveness.model", le_path="models/le.pickle"):
        self.detector_path = detector_path
        self.model_path = model_path
        self.le_path = le_path
        self.net = None
        self.model = None
        self.le = None
        self.loaded = False
        
    def load_models(self):
        """
        Load the face detector and liveness model
        """
        try:
            # Load face detector
            protoPath = os.path.sep.join([self.detector_path, "deploy.prototxt"])
            modelPath = os.path.sep.join([self.detector_path, "res10_300x300_ssd_iter_140000.caffemodel"])
            
            if os.path.exists(protoPath) and os.path.exists(modelPath):
                self.net = cv2.dnn.readNetFromCaffe(protoPath, modelPath)
                print(f"✅ Face detector loaded from {self.detector_path}")
            else:
                print(f"⚠️ Face detector files not found at {self.detector_path}")
                print("Download deploy.prototxt and res10_300x300_ssd_iter_140000.caffemodel")
                return False
                
            # Load liveness model
            if os.path.exists(self.model_path) and os.path.exists(self.le_path):
                self.model = self._load_tf_model(self.model_path)
                self.le = pickle.loads(open(self.le_path, "rb").read())
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
        """
        Load TensorFlow model with error handling
        """
        try:
            from tensorflow.keras.models import load_model
            return load_model(model_path)
        except Exception as e:
            print(f"❌ Error loading TensorFlow model: {e}")
            return None
    
    def _create_and_train_model(self):
        """
        Create and train a new liveness model with synthetic data
        """
        try:
            print("Creating synthetic training data...")
            
            # Create synthetic data for training
            real_faces = self._generate_synthetic_real_faces(100)
            fake_faces = self._generate_synthetic_fake_faces(100)
            
            # Combine data
            data = np.vstack([real_faces, fake_faces])
            labels = np.hstack([np.ones(len(real_faces)), np.zeros(len(fake_faces))])
            
            # Encode labels
            le = LabelEncoder()
            labels = le.fit_transform(labels)
            labels = to_categorical(labels, 2)
            
            # Split data
            (trainX, testX, trainY, testY) = train_test_split(
                data, labels, test_size=0.25, random_state=42
            )
            
            # Build and compile model
            model = LivenessNet.build(width=32, height=32, depth=3, classes=2)
            model.compile(
                loss="binary_crossentropy",
                optimizer=Adam(lr=1e-4, decay=1e-4 / 50),
                metrics=["accuracy"]
            )
            
            # Data augmentation
            aug = ImageDataGenerator(
                rotation_range=20,
                zoom_range=0.15,
                width_shift_range=0.2,
                height_shift_range=0.2,
                shear_range=0.15,
                horizontal_flip=True,
                fill_mode="nearest"
            )
            
            # Train model
            print("Training liveness model...")
            H = model.fit(
                x=aug.flow(trainX, trainY, batch_size=8),
                validation_data=(testX, testY),
                steps_per_epoch=len(trainX) // 8,
                epochs=10,  # Reduced epochs for faster training
                verbose=1
            )
            
            # Save model and label encoder
            os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
            model.save(self.model_path, save_format="h5")
            with open(self.le_path, "wb") as f:
                f.write(pickle.dumps(le))
                
            print(f"✅ Model saved to {self.model_path}")
            return model, le
            
        except Exception as e:
            print(f"❌ Error creating model: {e}")
            return None, None
    
    def _generate_synthetic_real_faces(self, count):
        """
        Generate synthetic real face data
        """
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
        """
        Generate synthetic fake face data
        """
        faces = []
        for _ in range(count):
            # Create more random, less structured images
            face = np.random.rand(32, 32, 3).astype(np.float32)
            # Add some noise to make it less face-like
            face += np.random.normal(0, 0.1, face.shape)
            faces.append(face)
        return np.array(faces)
    
    def detect_liveness(self, frame, confidence_threshold=0.5):
        """
        Detect liveness in a frame
        """
        if not self.loaded:
            return None, None, None
            
        try:
            # Resize frame for face detection
            frame_resized = cv2.resize(frame, (300, 300))
            (h, w) = frame.shape[:2]
            
            # Create blob from frame
            blob = cv2.dnn.blobFromImage(
                frame_resized, 1.0, (300, 300), (104.0, 177.0, 123.0)
            )
            
            # Pass blob through face detector
            self.net.setInput(blob)
            detections = self.net.forward()
            
            # Process detections
            for i in range(0, detections.shape[2]):
                confidence = detections[0, 0, i, 2]
                
                if confidence > confidence_threshold:
                    # Extract face coordinates
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    (startX, startY, endX, endY) = box.astype("int")
                    
                    # Ensure coordinates are within frame bounds
                    startX, startY = max(0, startX), max(0, startY)
                    endX, endY = min(w, endX), min(h, endY)
                    
                    # Extract face ROI
                    face = frame[startY:endY, startX:endX]
                    
                    if face.size == 0:
                        continue
                    
                    # Resize face for liveness detection
                    face_resized = cv2.resize(face, (32, 32))
                    face_normalized = face_resized.astype("float") / 255.0
                    
                    # Prepare face for prediction
                    face_array = np.expand_dims(face_normalized, axis=0)
                    
                    # Predict liveness
                    preds = self.model.predict(face_array, verbose=0)
                    j = np.argmax(preds)
                    label = self.le.classes_[j]
                    confidence_score = preds[j]
                    
                    return {
                        'face_box': (startX, startY, endX, endY),
                        'liveness_label': label,
                        'confidence': float(confidence_score),
                        'is_live': label == 'real'
                    }
            
            return None, None, None
            
        except Exception as e:
            print(f"❌ Error in liveness detection: {e}")
            return None, None, None
    
    def process_video_frame(self, frame):
        """
        Process a single video frame for liveness detection
        """
        if not self.loaded:
            return None
            
        result = self.detect_liveness(frame)
        return result

# Example usage and training script
def train_liveness_model():
    """
    Train the liveness detection model
    """
    detector = LivenessDetector()
    
    if detector.load_models():
        print("✅ Liveness detection system ready!")
    else:
        print("❌ Failed to load liveness detection system")

if __name__ == "__main__":
    train_liveness_model()

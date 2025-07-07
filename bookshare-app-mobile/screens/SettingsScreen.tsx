import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from '../types/navigation';
import { useUser } from '../context/UserContext';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  where,
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { db, storage } from '../firebase/firebase.config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

interface UserData {
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
}

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProps>();
  const { currentUser: user, setCurrentUser } = useUser();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bio, setBio] = useState('');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const defaultAvatar = require('../assets/images/default-avatar.png');

  const [initialPhoneNumber, setInitialPhoneNumber] = useState('');
  const [initialBio, setInitialBio] = useState('');
  const [isFormChanged, setIsFormChanged] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    const hasPhoneChanged = phoneNumber !== initialPhoneNumber;
    const hasBioChanged = bio !== initialBio;
    setIsFormChanged(hasPhoneChanged || hasBioChanged);
  }, [phoneNumber, bio, initialPhoneNumber, initialBio]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        setUserData(data);

        const phone = data.phoneNumber || '';
        const userBio = data.bio || '';
        setPhoneNumber(phone);
        setBio(userBio);
        setInitialPhoneNumber(phone);
        setInitialBio(userBio);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Błąd', 'Nie udało się załadować danych użytkownika');
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Błąd', 'Potrzebujemy dostępu do galerii aby zmienić zdjęcie profilowe');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        const { uri } = result.assets[0];
        await uploadImage(uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Błąd', 'Nie udało się wybrać zdjęcia');
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;

    try {
      setIsUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const imageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        photoURL: downloadURL,
      });

      const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
      const reviewsSnapshot = await getDocs(reviewsQuery);

      const updateReviewsPromises = reviewsSnapshot.docs.map((reviewDoc) =>
        updateDoc(reviewDoc.ref, {
          userPhotoURL: downloadURL,
        })
      );

      await Promise.all(updateReviewsPromises);

      if (user) {
        setCurrentUser({
          ...user,
          photoURL: downloadURL,
        });
      }

      await loadUserData();
      Alert.alert('Sukces', 'Zdjęcie profilowe zostało zaktualizowane');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować zdjęcia profilowego');
    } finally {
      setIsUploading(false);
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 11;
  };

  const formatPhoneForSaving = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.startsWith('48')) {
      const parts = [
        digitsOnly.slice(0, 2),
        digitsOnly.slice(2, 5),
        digitsOnly.slice(5, 8),
        digitsOnly.slice(8),
      ];
      return parts.join(' ').trim();
    }
    return digitsOnly.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  };

  const handleSubmit = async () => {
    if (!user || !isFormChanged) return;

    if (phoneNumber !== initialPhoneNumber && !validatePhoneNumber(phoneNumber)) {
      Alert.alert('Błąd', 'Wprowadź poprawny numer telefonu');
      return;
    }

    try {
      setIsLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const updateData: { [key: string]: string } = {};

      if (phoneNumber !== initialPhoneNumber) {
        updateData.phoneNumber = formatPhoneForSaving(phoneNumber);
      }
      if (bio !== initialBio) {
        updateData.bio = bio;
      }

      await updateDoc(userDocRef, updateData);
      Alert.alert('Sukces', 'Dane zostały zaktualizowane pomyślnie!');
      await loadUserData();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować profilu');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user) return;
    setPasswordError('');

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Błąd', 'Hasła nie są takie same');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Błąd', 'Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    try {
      setIsLoading(true);

      const credential = EmailAuthProvider.credential(user.email!, currentPassword);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      Alert.alert('Sukces', 'Hasło zostało zmienione pomyślnie!');
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Błąd', 'Nieprawidłowe obecne hasło');
      } else {
        Alert.alert('Błąd', 'Wystąpił błąd podczas zmiany hasła');
        console.error('Password change error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    if (!user) return;

    if (!password) {
      Alert.alert('Błąd', 'Wprowadź hasło aby usunąć konto');
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);

      try {
        const imageRef = ref(storage, `avatars/${user.uid}`);
        await deleteObject(imageRef);
      } catch (storageError) {
        console.log('No profile image to delete or already deleted');
      }

      const batch = [];

      const reviewsQuery = query(collection(db, 'reviews'), where('userId', '==', user.uid));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      batch.push(...reviewsSnapshot.docs.map((doc) => deleteDoc(doc.ref)));

      const userContactsQuery1 = query(
        collection(db, 'userContacts'),
        where('userId', '==', user.uid)
      );
      const userContactsQuery2 = query(
        collection(db, 'userContacts'),
        where('contactId', '==', user.uid)
      );
      const [contactsSnapshot1, contactsSnapshot2] = await Promise.all([
        getDocs(userContactsQuery1),
        getDocs(userContactsQuery2),
      ]);

      batch.push(
        ...contactsSnapshot1.docs.map((doc) => deleteDoc(doc.ref)),
        ...contactsSnapshot2.docs.map((doc) => deleteDoc(doc.ref))
      );

      const collections = ['bookDesire', 'bookFavorites', 'bookOwnership'];
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        batch.push(...snapshot.docs.map((doc) => deleteDoc(doc.ref)));
      }

      await Promise.all(batch);

      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(userDocRef);

      await user.delete();

      Alert.alert('Konto usunięte', 'Twoje konto zostało pomyślnie usunięte', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Błąd', 'Nieprawidłowe hasło');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Błąd', 'Wymagane ponowne zalogowanie. Spróbuj zalogować się ponownie.');
      } else {
        Alert.alert('Błąd', 'Wystąpił błąd podczas usuwania konta');
        console.error('Delete account error:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Ustawienia profilu</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Ustawienia ogólne</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.profilePictureSection}>
              <Image
                source={userData?.photoURL ? { uri: userData.photoURL } : defaultAvatar}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handleImagePick}
                disabled={isUploading}>
                <Text style={styles.changePhotoButtonText}>
                  {isUploading ? 'Aktualizowanie...' : 'Zmień zdjęcie'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.disabledInput} value={user?.email || ''} editable={false} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Numer telefonu</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Podaj numer telefonu"
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={styles.textArea}
                value={bio}
                onChangeText={setBio}
                placeholder="Napisz coś o sobie..."
                multiline
                numberOfLines={3}
              />
            </View>
            <TouchableOpacity
              style={[styles.saveButton, (!isFormChanged || isLoading) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!isFormChanged || isLoading}>
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Bezpieczeństwo</Text>
          </View>

          <View style={styles.cardContent}>
            <TouchableOpacity
              style={styles.securityButton}
              onPress={() => setIsPasswordModalVisible(true)}>
              <Text style={styles.securityButtonText}>Zmień hasło</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => setIsDeleteModalVisible(true)}>
              <Text style={styles.deleteButtonText}>Usuń konto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Usuń konto</Text>
            <Text style={styles.modalText}>
              Tej operacji nie można cofnąć. Wszystkie Twoje dane zostaną trwale usunięte.
            </Text>

            <View style={styles.passwordField}>
              <Text style={styles.label}>Potwierdź hasło</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="Wprowadź hasło"
              />
            </View>

            <View style={styles.checkboxContainer}>
              <Switch
                value={confirmDelete}
                onValueChange={setConfirmDelete}
                trackColor={{ false: '#d1d5db', true: '#007304' }}
                thumbColor={confirmDelete ? '#ffffff' : '#f4f3f4'}
              />
              <Text style={styles.checkboxLabel}>
                Potwierdzam, że chcę trwale usunąć moje konto
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsDeleteModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeleteButton, !confirmDelete && styles.disabledButton]}
                disabled={!confirmDelete}
                onPress={handleDeleteAccount}>
                <Text style={styles.confirmDeleteButtonText}>Usuń konto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isPasswordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Zmień hasło</Text>

            <View style={styles.passwordField}>
              <Text style={styles.label}>Obecne hasło</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Wprowadź obecne hasło"
              />
            </View>

            <View style={styles.passwordField}>
              <Text style={styles.label}>Nowe hasło</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Wprowadź nowe hasło"
              />
            </View>

            <View style={styles.passwordField}>
              <Text style={styles.label}>Potwierdź nowe hasło</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Potwierdź nowe hasło"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsPasswordModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.changePasswordButton,
                  (!currentPassword || !newPassword || !confirmNewPassword || isLoading) &&
                    styles.disabledButton,
                ]}
                onPress={handlePasswordChange}
                disabled={!currentPassword || !newPassword || !confirmNewPassword || isLoading}>
                <Text style={styles.changePasswordButtonText}>
                  {isLoading ? 'Weryfikacja...' : 'Zmień hasło'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    backgroundColor: '#007304',
    padding: 12,
  },
  cardHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardContent: {
    padding: 16,
  },
  profilePictureSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  changePhotoButton: {
    backgroundColor: '#007304',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePhotoButtonText: {
    color: 'white',
    fontSize: 14,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#6b7280',
  },
  textArea: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#007304',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  securityButton: {
    backgroundColor: '#007304',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  securityButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modalText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
  },
  passwordField: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  changePasswordButton: {
    backgroundColor: '#007304',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default SettingsScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import BackgroundVideo from './components/BackgroundVideo';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './global.css';

// Import Firebase auth
import { auth, db } from './firebase/firebase.config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

// Import icons from components
import { EmailIcon } from './components/svg-icons/EmailIcon';
import { LockIcon } from './components/svg-icons/LockIcon';
import { UserIcon } from './components/svg-icons/UserIcon';
import { GoogleIcon } from './components/svg-icons/GoogleIcon';
import { FacebookIcon } from './components/svg-icons/FacebookIcon';
import { useNavigation } from '@react-navigation/native';
import { NavigationProps } from 'types/navigation';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useUser } from './context/UserContext';

// Form validation schema
const schema = yup.object().shape({
  firstName: yup
    .string()
    .required('Imię jest wymagane')
    .min(2, 'Imię musi mieć co najmniej 2 znaki'),
  lastName: yup
    .string()
    .required('Nazwisko jest wymagane')
    .min(2, 'Nazwisko musi mieć co najmniej 2 znaki'),
  email: yup.string().required('Email jest wymagany').email('Nieprawidłowy format email'),
  password: yup
    .string()
    .required('Hasło jest wymagane')
    .min(6, 'Hasło musi mieć co najmniej 6 znaków'),
  repeatPassword: yup
    .string()
    .required('Powtórz hasło')
    .oneOf([yup.ref('password')], 'Hasła nie są identyczne'),
});

export default function Registration() {
  const navigation = useNavigation<NavigationProps>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { setCurrentUser } = useUser();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      repeatPassword: '',
    },
  });

  const createUserDocument = async (
    userId: string,
    userData: {
      email: string;
      displayName: string;
      photoURL?: string | null;
    }
  ) => {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userData.email,
        displayName: userData.displayName || 'Użytkownik',
        photoURL: userData.photoURL || null,
        phoneNumber: '',
        bio: '',
        createdAt: serverTimestamp(),
        reviewsCount: 0,
        averageRating: 0.0,
      });
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMessage('');

    try {
      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // Update user profile with display name
      const displayName = `${data.firstName} ${data.lastName}`;

      // Use the updateProfile function imported from firebase/auth
      await updateProfile(user, {
        displayName: displayName,
      });

      // Create user document in Firestore
      await createUserDocument(user.uid, {
        email: data.email,
        displayName: displayName,
      });

      // Zapisujemy użytkownika w kontekście
      setCurrentUser(user);

      console.log('User registered successfully:', user.uid);

      alert('Rejestracja pomyślna!');
      navigation.navigate('MainTabs');
    } catch (error: any) {
      // Handle specific Firebase error codes
      let errorMsg = 'Wystąpił błąd podczas rejestracji';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMsg = 'Ten adres email jest już używany';
          break;
        case 'auth/invalid-email':
          errorMsg = 'Nieprawidłowy adres email';
          break;
        case 'auth/weak-password':
          errorMsg = 'Hasło jest zbyt słabe';
          break;
        default:
          errorMsg = `Błąd rejestracji: ${error.message}`;
      }

      setErrorMessage(errorMsg);
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Implement Google sign in
      console.log('Google sign in');
    } catch (error) {
      setErrorMessage('Błąd logowania przez Google');
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      // Implement Facebook sign in
      console.log('Facebook sign in');
    } catch (error) {
      setErrorMessage('Błąd logowania przez Facebook');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Rejestracja</Text>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* First name and Last name row */}
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <View style={styles.iconContainer}>
                        <UserIcon />
                      </View>
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Imię"
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                  )}
                />
                {errors.firstName && (
                  <Text style={styles.fieldError}>{errors.firstName.message}</Text>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <View style={styles.iconContainer}>
                        <UserIcon />
                      </View>
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Nazwisko"
                        value={value}
                        onChangeText={onChange}
                      />
                    </View>
                  )}
                />
                {errors.lastName && (
                  <Text style={styles.fieldError}>{errors.lastName.message}</Text>
                )}
              </View>
            </View>

            {/* Email input */}
            <View style={styles.inputWrapperFull}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.inputContainer}>
                    <View style={styles.iconContainer}>
                      <EmailIcon width={18} height={18} fill="gray" />
                    </View>
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Email"
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                )}
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>

            {/* Password row */}
            <View style={styles.row}>
              <View style={styles.inputWrapper}>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <View style={styles.iconContainer}>
                        <LockIcon width={18} height={18} fill="gray" />
                      </View>
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Hasło"
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry
                      />
                    </View>
                  )}
                />
                {errors.password && (
                  <Text style={styles.fieldError}>{errors.password.message}</Text>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Controller
                  control={control}
                  name="repeatPassword"
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.inputContainer}>
                      <View style={styles.iconContainer}>
                        <LockIcon width={18} height={18} fill="gray" />
                      </View>
                      <TextInput
                        style={styles.inputWithIcon}
                        placeholder="Powtórz hasło"
                        value={value}
                        onChangeText={onChange}
                        secureTextEntry
                      />
                    </View>
                  )}
                />
                {errors.repeatPassword && (
                  <Text style={styles.fieldError}>{errors.repeatPassword.message}</Text>
                )}
              </View>
            </View>

            {/* Register button */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'Rejestracja...' : 'Zarejestruj się'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>lub</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
                <GoogleIcon width={18} height={18} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} onPress={handleFacebookSignIn}>
                <FacebookIcon width={18} height={18} />
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Masz już konto?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Zaloguj się</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Make container transparent
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: 'black',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#B71C1C',
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  inputWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputWrapperFull: {
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconContainer: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: '#374151',
    fontSize: 14,
  },
  fieldError: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  button: {
    backgroundColor: '#007304', // primaryColor from your CSS
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#6b7280',
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#007304', // primaryColor from your CSS
    fontWeight: 'bold',
    marginTop: 5,
    fontSize: 15,
  },
});

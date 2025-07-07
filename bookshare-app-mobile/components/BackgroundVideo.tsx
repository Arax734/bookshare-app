import React, { useRef, useState } from 'react';
import { StyleSheet, View, ImageBackground } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

export default function BackgroundVideo() {
  const video = useRef(null);
  const [videoError, setVideoError] = useState(false);

  if (videoError) {
    return (
      <View style={styles.videoContainer}>
        <ImageBackground
          source={require('../assets/images/library-image.jpeg')}
          style={styles.video}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      <Video
        ref={video}
        style={styles.video}
        source={require('../assets/movies/library-movie.mp4')}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        onError={(error) => {
          console.log('Video error:', error);
          setVideoError(true);
        }}
        onLoad={() => console.log('Video loaded successfully')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
});

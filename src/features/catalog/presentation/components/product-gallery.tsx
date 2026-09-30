import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';

interface ProductGalleryProps {
  imageUrls: string[];
  name: string;
}

export function ProductGallery({ imageUrls, name }: ProductGalleryProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View testID="product-gallery" className="bg-surface-muted">
      <FlatList
        data={imageUrls}
        keyExtractor={(url, i) => `${i}-${url}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <Image
            source={{ uri: item }}
            contentFit="cover"
            transition={200}
            style={{ width, height: width }}
            accessibilityLabel={`${name}, image ${i + 1} of ${imageUrls.length}`}
          />
        )}
      />
      {imageUrls.length > 1 ? (
        <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
          {imageUrls.map((url, i) => (
            <View
              key={`${i}-${url}`}
              testID={`gallery-dot-${i}`}
              className={`size-2 rounded-full ${i === index ? 'bg-primary' : 'bg-border'}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

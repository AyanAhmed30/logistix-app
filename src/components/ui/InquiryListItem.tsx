import { StyleSheet, View } from 'react-native';

import {
  InquiryAttachments,
  InquiryImageGallery,
  InquiryProductDetails,
  useInquiryMedia,
} from '@/components/inquiry';
import { CustomerInquiry } from '@/types/inquiry';

type InquiryListItemProps = {
  inquiry: CustomerInquiry;
};

export function InquiryListItem({ inquiry }: InquiryListItemProps) {
  const { imageUrls, documentUrls } = useInquiryMedia(inquiry);

  return (
    <View style={styles.wrap}>
      <InquiryProductDetails inquiry={inquiry}>
        <InquiryImageGallery imageUrls={imageUrls} />
        <InquiryAttachments documentUrls={documentUrls} linkUrl={inquiry.linkUrl} />
      </InquiryProductDetails>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});

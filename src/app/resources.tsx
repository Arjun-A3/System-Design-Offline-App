import { Alert, Linking } from 'react-native';

import { curriculumResources } from '@/curriculum';
import { AppText, Button, Card, Screen } from '@/ui/components';

export default function ResourcesScreen() {
  return (
    <Screen>
      <AppText role="display">Resources</AppText>
      <AppText>
        These are pointers to primary sources and engineering publications. The summaries below are original and bundled. The external pages are not. A lesson does not depend on opening them.
      </AppText>
      {curriculumResources.map((resource) => (
        <Card key={resource.id}>
          <AppText role="title">{resource.title}</AppText>
          <AppText role="small">
            {resource.publisher}
            {resource.published ? ` · ${resource.published}` : ''} · {resource.difficulty}
          </AppText>
          <AppText>{resource.summary}</AppText>
          {resource.questions.map((question) => (
            <AppText key={question} role="small">
              • {question}
            </AppText>
          ))}
          <AppText role="small">Tags: {resource.topicTags.join(', ')}</AppText>
          <Button
            label="Open canonical page"
            tone="secondary"
            onPress={() =>
              Alert.alert('Internet required', 'This article is not stored in the app.', [
                { text: 'Stay here', style: 'cancel' },
                { text: 'Open', onPress: () => Linking.openURL(resource.url) },
              ])
            }
          />
        </Card>
      ))}
    </Screen>
  );
}

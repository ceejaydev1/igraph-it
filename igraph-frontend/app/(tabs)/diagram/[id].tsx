import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
  Animated,
  StatusBar,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Svg, Path, Circle } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { DIAGRAM_ICON_MAP, GenericDiagramGlyph } from '../../../constants/diagramTypeIcons';


// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagramSection {
  heading: string;
  body: string;
}

import { ImageSourcePropType } from 'react-native';

interface DiagramContent {
  id: number;
  title: string;
  type: 'UML' | 'SDLC';
  tagline: string;
  videoId: string;
  sections: DiagramSection[];
  steps?: string[];
  keyPoints?: string[];
  imageAlt: string;
  placeholderImage?: ImageSourcePropType;
}

interface TypeConfig {
  primary: string;
  light: string;
  gradient: readonly [string, string];
  accent: string;
}

// ─── Content Data ─────────────────────────────────────────────────────────────

const LOREM_SHORT = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
const LOREM_BODY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';
const LOREM_BODY_2 = 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
const LOREM_BODY_3 = 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.';

const DEFAULT_SECTIONS: DiagramSection[] = [
  { heading: 'Lorem Ipsum Dolor Sit', body: LOREM_BODY },
  { heading: 'Consectetur Adipiscing Elit', body: LOREM_BODY_2 },
  { heading: 'Sed Do Eiusmod Tempor', body: LOREM_BODY_3 },
];

const DEFAULT_STEPS = [
  'Lorem ipsum dolor sit amet',
  'Consectetur adipiscing elit',
  'Sed do eiusmod tempor incididunt',
  'Ut labore et dolore magna aliqua',
  'Ut enim ad minim veniam',
  'Quis nostrud exercitation ullamco',
];

const DEFAULT_KEY_POINTS = [
  'Lorem ipsum dolor sit amet, consectetur',
  'Sed do eiusmod tempor incididunt ut labore',
  'Ut enim ad minim veniam, quis nostrud',
  'Duis aute irure dolor in reprehenderit',
];

const PLACEHOLDER_VIDEO_ID = 'dQw4w9WgXcQ';

const createUMLDiagram = (id: number, title: string, imageAlt: string): DiagramContent => ({
  id,
  title,
  type: 'UML',
  tagline: LOREM_SHORT,
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt,
  sections: DEFAULT_SECTIONS,
  steps: DEFAULT_STEPS,
  keyPoints: DEFAULT_KEY_POINTS,
});

const createSDLCDiagram = (id: number, title: string, imageAlt: string): DiagramContent => ({
  id,
  title,
  type: 'SDLC',
  tagline: LOREM_SHORT,
  videoId: PLACEHOLDER_VIDEO_ID,
  imageAlt,
  sections: DEFAULT_SECTIONS,
  steps: DEFAULT_STEPS,
  keyPoints: DEFAULT_KEY_POINTS,
});

const DIAGRAM_CONTENT: Record<number, DiagramContent> = {
  1: createUMLDiagram(1, 'Functional Decomposition Diagram', 'Functional Decomposition Diagram example'),
  2: createUMLDiagram(2, 'Flowchart', 'Flowchart example'),
  3: createUMLDiagram(3, 'Data Flow Diagram', 'Data Flow Diagram example'),
  4: createUMLDiagram(4, 'Entity Relationship Diagram', 'Entity Relationship Diagram example'),
  5: createUMLDiagram(5, 'Fishbone Diagram', 'Fishbone Diagram example'),
  6: createUMLDiagram(6, 'Schematic Diagram', 'Schematic Diagram example'),
  7: createUMLDiagram(7, 'Use Case Diagram', 'Use Case Diagram example'),
  8: createUMLDiagram(8, 'Activity Diagram', 'Activity Diagram example'),
  9: createUMLDiagram(9, 'Sequence Diagram', 'Sequence Diagram example'),
  10: createUMLDiagram(10, 'Class Diagram', 'Class Diagram example'),
  11: createSDLCDiagram(11, 'Waterfall Model', 'Waterfall Model diagram'),
  12: createSDLCDiagram(12, 'Big Bang Model', 'Big Bang Model diagram'),
  13: createSDLCDiagram(13, 'Prototype Model', 'Prototype Model diagram'),
  14: createSDLCDiagram(14, 'Agile Model', 'Agile Model diagram'),
  15: createSDLCDiagram(15, 'Iterative Model', 'Iterative Model diagram'),
  16: createSDLCDiagram(16, 'V Model', 'V Model diagram'),
  17: createSDLCDiagram(17, 'Rapid Application Development', 'RAD Model diagram'),
  18: createSDLCDiagram(18, 'Spiral Model', 'Spiral Model diagram'),
};

// ─── Color Configuration ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<'UML' | 'SDLC', TypeConfig> = {
  UML: {
    primary: '#4c6fff',
    light: '#eef2ff',
    gradient: ['#4c6fff', '#6b85ff'],
    accent: '#3a5be8',
  },
  SDLC: {
    primary: '#10b981',
    light: '#ecfdf5',
    gradient: ['#10b981', '#34d399'],
    accent: '#059669',
  },
} as const;

// ─── Responsive Breakpoints ──────────────────────────────────────────────────

const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  maxContentWidth: 1280,
} as const;

// ─── SVG Icons ────────────────────────────────────────────────────────────────

interface IconProps {
  color: string;
}

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18l-6-6 6-6"
      stroke="#1E293B"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlayIcon: React.FC = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.2)" />
    <Path d="M10 8L16 12L10 16V8Z" fill="#ffffff" />
  </Svg>
);

const CheckIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Diagram Placeholder Component ──────────────────────────────────────────

interface DiagramPlaceholderProps {
  color: string;
  label: string;
  title: string;
}

// Dashed border + tint keep this reading as "placeholder, not final artwork" — but the
// glyph inside is the same per-type icon used on the Home grid, so it's a placeholder
// specific to this diagram rather than the generic "image failed to load" convention.
const DiagramPlaceholder: React.FC<DiagramPlaceholderProps> = ({ color, label, title }) => {
  const Icon = DIAGRAM_ICON_MAP[title] ?? GenericDiagramGlyph;
  return (
    <View style={placeholderStyles.container}>
      <View style={[placeholderStyles.imageBox, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Icon color={color} />
        <Text style={[placeholderStyles.text, { color }]} numberOfLines={2}>{label}</Text>
      </View>
    </View>
  );
};

const placeholderStyles = StyleSheet.create({
  container: {
    width: '100%',
    flexShrink: 0,
  },
  imageBox: {
    width: '100%',
    maxHeight: 180,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  text: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
});

// ─── Video Player Component ──────────────────────────────────────────────────

interface VideoPlayerProps {
  videoId: string;
  color: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, color }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => setIsPlaying(true);

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  if (Platform.OS === 'web') {
    return (
      <View style={videoStyles.container}>
        {!isPlaying ? (
          <TouchableOpacity
            style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
            onPress={handlePlay}
            activeOpacity={0.9}
            accessibilityLabel="Play tutorial video"
            accessibilityRole="button"
          >
            <View style={[videoStyles.playButton, { backgroundColor: color }]}>
              <PlayIcon />
            </View>
            <Text style={[videoStyles.thumbnailText, { color }]}>Watch Tutorial</Text>
          </TouchableOpacity>
        ) : (
          <View style={videoStyles.iframeContainer}>
            <iframe
              width="100%"
              height="100%"
              src={embedUrl}
              title="Tutorial Video"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ borderRadius: 12 }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={videoStyles.container}>
      {!isPlaying ? (
        <TouchableOpacity
          style={[videoStyles.thumbnail, { backgroundColor: `${color}15` }]}
          onPress={handlePlay}
          activeOpacity={0.9}
          accessibilityLabel="Play tutorial video"
          accessibilityRole="button"
        >
          <View style={[videoStyles.playButton, { backgroundColor: color }]}>
            <PlayIcon />
          </View>
          <Text style={[videoStyles.thumbnailText, { color }]}>Watch Tutorial</Text>
        </TouchableOpacity>
      ) : (
        <WebView
          style={videoStyles.webview}
          javaScriptEnabled
          source={{ uri: embedUrl }}
        />
      )}
    </View>
  );
};

// Placeholder video ID shared by every entry in DIAGRAM_CONTENT until real tutorial
// videos are recorded — routes here instead of embedding a real (if unrelated) video.
const VideoOffIcon: React.FC<IconProps> = ({ color }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 10l5-3v10l-5-3M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VideoComingSoon: React.FC<{ color: string }> = ({ color }) => (
  <View style={[videoStyles.container, videoStyles.comingSoon, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
    <VideoOffIcon color={color} />
    <Text style={[videoStyles.thumbnailText, { color }]}>Tutorial video coming soon</Text>
  </View>
);

const videoStyles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1f36',
  },
  comingSoon: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  thumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  thumbnailText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iframeContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

// ─── Shared Card Shell ────────────────────────────────────────────────────────
// One quiet container recipe reused underneath every content block below, so
// the *content type* (section / step / key point) is what visually differs —
// not three copies of the same "white card + shadow" box.

const cardShell = {
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: '#eef1f6',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.03,
  shadowRadius: 6,
  elevation: 1,
} as const;

// ─── Section Card Component ──────────────────────────────────────────────────
// Marker is a small square "node" rather than a full-height colored bar —
// a nod to the diagram nodes this app is actually about, used with restraint.

interface SectionCardProps {
  heading: string;
  body: string;
  color: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ heading, body, color }) => (
  <View style={sectionStyles.card}>
    <View style={sectionStyles.markerRow}>
      <View style={[sectionStyles.node, { borderColor: color }]}>
        <View style={[sectionStyles.nodeDot, { backgroundColor: color }]} />
      </View>
      <Text style={[sectionStyles.heading, { color }]}>{heading}</Text>
    </View>
    <Text style={sectionStyles.body}>{body}</Text>
  </View>
);

const sectionStyles = StyleSheet.create({
  card: {
    ...cardShell,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  node: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 1.5,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── Steps List Component ────────────────────────────────────────────────────
// Same node motif as SectionCard, but chained with a connecting line — since
// steps are genuinely sequential, the line is information, not decoration.

interface StepsListProps {
  steps: string[];
  color: string;
}

const StepsList: React.FC<StepsListProps> = ({ steps, color }) => (
  <View style={stepsStyles.container}>
    <Text style={[stepsStyles.title, { color }]}>Step-by-Step Process</Text>
    {steps.map((step, index) => (
      <View key={index} style={stepsStyles.stepRow}>
        <View style={stepsStyles.stepMarkerCol}>
          <View style={[stepsStyles.stepNode, { borderColor: color }]}>
            <Text style={[stepsStyles.stepNumberText, { color }]}>{index + 1}</Text>
          </View>
          {index < steps.length - 1 && (
            <View style={[stepsStyles.connector, { backgroundColor: `${color}30` }]} />
          )}
        </View>
        <Text style={stepsStyles.stepText}>{step}</Text>
      </View>
    ))}
  </View>
);

const stepsStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepMarkerCol: {
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  connector: {
    width: 1.5,
    flex: 1,
    minHeight: 18,
    marginVertical: 4,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    paddingBottom: 18,
  },
});

// ─── Key Points Component ────────────────────────────────────────────────────
// Deliberately the odd one out: no node/sequence marker, because these points
// aren't ordered. A plain hairline check keeps it visually distinct from the
// sequential blocks above instead of repeating their motif by default.

interface KeyPointsProps {
  points: string[];
  color: string;
}

const KeyPoints: React.FC<KeyPointsProps> = ({ points, color }) => (
  <View style={keyPointsStyles.container}>
    <Text style={[keyPointsStyles.title, { color }]}>Key Points to Remember</Text>
    {points.map((point, index) => (
      <View key={index} style={keyPointsStyles.row}>
        <View style={[keyPointsStyles.icon, { borderColor: color }]}>
          <CheckIcon color={color} />
        </View>
        <Text style={keyPointsStyles.text}>{point}</Text>
      </View>
    ))}
  </View>
);

const keyPointsStyles = StyleSheet.create({
  container: {
    ...cardShell,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
});

// ─── Learning Feedback Form Component (both UML and SDLC diagrams) ──────────

interface FeedbackFormProps {
  color: string;
  diagramType: 'UML' | 'SDLC';
}

const LearningFeedbackForm: React.FC<FeedbackFormProps> = ({ color, diagramType }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!feedback.trim()) {
      Alert.alert(
        'Empty Response',
        'Please write something about what you learned.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Thank You!',
      'Your feedback has been submitted successfully.',
      [{ text: 'OK' }]
    );
    setFeedback('');
  };

  const question = diagramType === 'SDLC' ? 'What did you learn in this SDLC?' : 'What did you learn in this diagram?';

  return (
    <View style={feedbackStyles.container}>
      <Text style={[feedbackStyles.title, { color }]}>
        {question}
      </Text>
      <TextInput
        style={[feedbackStyles.input, { borderColor: '#e2e8f0' }]}
        placeholder="Share your learning experience..."
        placeholderTextColor="#94a3b8"
        multiline
        numberOfLines={4}
        value={feedback}
        onChangeText={setFeedback}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[feedbackStyles.submitButton, { backgroundColor: color }]}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <Text style={feedbackStyles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const feedbackStyles = StyleSheet.create({
  container: {
    ...cardShell,
    gap: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    fontSize: 15,
    color: '#334155',
    backgroundColor: '#f8faff',
    minHeight: 120,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});

// ─── Helper Hook: useDiagramParams ───────────────────────────────────────────

const useDiagramParams = () => {
  const params = useLocalSearchParams();
  const rawId = params.id;
  return Array.isArray(rawId) ? rawId[0] : rawId;
};

// ─── Main Screen Component ───────────────────────────────────────────────────

const DiagramDetail: React.FC = () => {
  const id = useDiagramParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const isDesktop = width >= BREAKPOINTS.desktop;
  const isTablet = width >= BREAKPOINTS.tablet;

  const diagramId = parseInt(id ?? '1', 10);
  const content = DIAGRAM_CONTENT[diagramId];
  const colors = content ? TYPE_CONFIG[content.type] : TYPE_CONFIG.UML;
  const hasRealVideo = content ? content.videoId !== PLACEHOLDER_VIDEO_ID : false;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // The floating header fades in via opacity, but opacity alone doesn't stop
  // touches in React Native — while invisible (scrollY < 80) it still sits on
  // top of the hero back button and swallows taps. Track visibility in state
  // so we can set pointerEvents="none" until it's actually shown.
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      setIsHeaderVisible((prev) => {
        const next = value >= 80;
        return prev === next ? prev : next;
      });
    });
    return () => scrollY.removeListener(listenerId);
  }, [scrollY]);

  // Always navigate back to the home screen
  const handleGoHome = () => {
    router.replace('/(tabs)/home');
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  if (!content) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Diagram not found.</Text>
        <TouchableOpacity onPress={handleGoHome} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Desktop: sticky sidebar with just the video (NO diagram preview). Key Points and
  // the feedback form live in the main column below, in the same order as mobile —
  // see renderDesktopContent — since "Key Points to Remember" reads as a recap of
  // what was just read, not a preview to show before the sections.
  const renderDesktopSidebar = () => {
    if (!isDesktop) return null;

    return (
      <View style={[styles.sidebar, styles.sidebarDesktop]}>
        <View style={styles.videoWrap}>
          <Text style={[styles.sectionLabel, { color: colors.primary }]}>Video Tutorial</Text>
          {hasRealVideo ? (
            <VideoPlayer videoId={content.videoId} color={colors.primary} />
          ) : (
            <VideoComingSoon color={colors.primary} />
          )}
        </View>
      </View>
    );
  };

  // Desktop: main content column — same order as mobile (Sections, Steps, Key
  // Points, Feedback) so the two layouts tell the same story, not just the same words.
  const renderDesktopContent = () => {
    if (!isDesktop) return null;

    return (
      <View style={styles.contentColumnDesktop}>
        {content.sections.map((section, i) => (
          <SectionCard
            key={`section-${i}`}
            heading={section.heading}
            body={section.body}
            color={colors.primary}
          />
        ))}

        {content.steps && (
          <StepsList steps={content.steps} color={colors.primary} />
        )}

        {content.keyPoints && (
          <KeyPoints points={content.keyPoints} color={colors.primary} />
        )}

        <LearningFeedbackForm color={colors.primary} diagramType={content.type} />
      </View>
    );
  };

  // Mobile/Tablet: single column layout
  const renderMobileContent = () => {
    if (isDesktop) return null;
    
    return (
      <View style={styles.contentColumn}>
        {content.sections.map((section, i) => (
          <SectionCard
            key={`section-${i}`}
            heading={section.heading}
            body={section.body}
            color={colors.primary}
          />
        ))}
        
        {content.steps && (
          <StepsList steps={content.steps} color={colors.primary} />
        )}
        
        {content.keyPoints && (
          <KeyPoints points={content.keyPoints} color={colors.primary} />
        )}
        
        <LearningFeedbackForm color={colors.primary} diagramType={content.type} />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <Animated.View
        pointerEvents={isHeaderVisible ? 'auto' : 'none'}
        style={[
          styles.floatingBar,
          {
            opacity: headerOpacity,
            borderBottomColor: `${colors.primary}20`,
          },
        ]}>
        <TouchableOpacity
          onPress={handleGoHome}
          style={styles.floatingBackBtn}
          activeOpacity={0.6}
          accessibilityLabel="Go back to home"
          accessibilityRole="button"
        >
          <BackIcon />
        </TouchableOpacity>
        <Text
          style={[styles.floatingTitle, { color: '#1a1f36' }]}
          numberOfLines={1}
        >
          {content.title}
        </Text>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        {/* Hero Section with Title, Tagline, Diagram, and Video */}
        <View style={[styles.hero, { backgroundColor: colors.light }]}>
          <TouchableOpacity
            onPress={handleGoHome}
            style={styles.heroBackBtn}
            activeOpacity={0.6}
            accessibilityLabel="Go back to home"
            accessibilityRole="button"
          >
            <BackIcon />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <View style={styles.titleStack}>
              <Text style={[
                styles.heroTitle,
                isTablet && styles.heroTitleTablet,
                isDesktop && styles.heroTitleDesktop,
              ]}>
                {content.title}
              </Text>
              <Text style={styles.heroTagline}>{content.tagline}</Text>
            </View>
            
            {/* Diagram preview — only once in hero */}
            {content.placeholderImage ? (
              <Image
                source={content.placeholderImage}
                style={styles.heroImage}
                accessibilityLabel={content.imageAlt}
                resizeMode="contain"
              />
            ) : (
              <DiagramPlaceholder color={colors.primary} label={content.imageAlt} title={content.title} />
            )}
            
            {/* Video directly below diagram on mobile/tablet only */}
            {!isDesktop && (
              <View style={styles.videoWrap}>
                <Text style={[styles.sectionLabel, { color: colors.primary }]}>Video Tutorial</Text>
                {hasRealVideo ? (
                  <VideoPlayer videoId={content.videoId} color={colors.primary} />
                ) : (
                  <VideoComingSoon color={colors.primary} />
                )}
              </View>
            )}
          </View>
        </View>

        {/* Body Section */}
        <View style={[
          styles.body,
          isDesktop ? styles.bodyDesktop : styles.bodyMobile,
          isTablet && !isDesktop && styles.bodyTablet,
        ]}>
          {renderDesktopSidebar()}
          {renderMobileContent()}
          {renderDesktopContent()}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default DiagramDetail;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8faff',
  },
  floatingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(248, 250, 255, 0.96)',
    borderBottomWidth: 1,
    gap: 10,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px)' },
    }),
  },
  floatingBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  floatingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1f36',
  },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  heroBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 24,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  heroContent: {
    gap: 24,
  },
  titleStack: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1f36',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heroTitleTablet: {
    fontSize: 32,
    lineHeight: 40,
  },
  heroTitleDesktop: {
    fontSize: 36,
    lineHeight: 44,
  },
  heroTagline: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  heroImage: {
    width: '100%',
    maxHeight: 180,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 48,
  },
  scrollContentDesktop: {
    maxWidth: BREAKPOINTS.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  body: {
    padding: 16,
  },
  bodyMobile: {
    flexDirection: 'column',
    gap: 0,
  },
  bodyTablet: {
    paddingHorizontal: 24,
  },
  bodyDesktop: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  sidebar: {
    gap: 20,
  },
  sidebarDesktop: {
    width: 380,
    flexShrink: 0,
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: 90,
    alignSelf: 'flex-start',
  },
  contentColumn: {
    gap: 0,
  },
  contentColumnDesktop: {
    flex: 1,
  },
  videoWrap: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8faff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
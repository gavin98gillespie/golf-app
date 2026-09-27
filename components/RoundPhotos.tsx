import { useState } from 'react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/date';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { fontFamily, palette } from '@/theme/linksman';
import { useSession } from '@/lib/hooks/useSession';
import {
  usePhotoActions,
  usePhotoUrl,
  useProfilePhotos,
  useRoundPhotos,
  type RoundPhoto,
} from '@/lib/queries/roundPhotos';
import { pickRoundPhoto } from '@/lib/photos/picker';
import type { PhotoTarget } from '@/lib/photos/model';

function CameraMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M3 7h4l2-3h6l2 3h4v13H3z" stroke={palette.brass} strokeWidth={1.3} fill="none" />
      <Circle cx={12} cy={13} r={4} stroke={palette.brass} strokeWidth={1.3} fill="none" />
    </Svg>
  );
}
const label = (p: RoundPhoto) =>
  p.kind === 'group' ? 'Group photo' : `Hole in one · Hole ${p.hole_number}`;
export function PhotoImage({
  photo,
  thumbnail = false,
}: {
  photo: RoundPhoto;
  thumbnail?: boolean;
}) {
  const url = usePhotoUrl(photo);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${label(photo)}`}
        onPress={(e) => {
          e.stopPropagation();
          if (url.isError || failed) {
            setFailed(false);
            void url.refetch();
          } else setOpen(true);
        }}
        style={{
          backgroundColor: palette.graphite,
          aspectRatio: thumbnail ? 1 : 4 / 3,
          overflow: 'hidden',
          borderRadius: 4,
          justifyContent: 'center',
        }}
      >
        {url.data && !failed ? (
          <Image
            source={{ uri: url.data }}
            accessibilityLabel={label(photo)}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setFailed(true)}
          />
        ) : url.isPending ? (
          <ActivityIndicator color={palette.brass} />
        ) : (
          <Text style={s.small}>Photo unavailable · Tap to retry</Text>
        )}
      </Pressable>
      <Modal visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={s.close}>
            <Text style={s.text}>Close</Text>
          </Pressable>
          {url.data && (
            <Image source={{ uri: url.data }} style={{ flex: 1 }} resizeMode="contain" />
          )}
          <Text style={[s.small, { padding: 24, textAlign: 'center' }]}>{label(photo)}</Text>
        </SafeAreaView>
      </Modal>
    </>
  );
}
export function PhotoSlot({
  target,
  photo,
  title,
  editable,
}: {
  target: PhotoTarget;
  photo?: RoundPhoto;
  title: string;
  editable: boolean;
}) {
  const actions = usePhotoActions();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = async (bytes: ArrayBuffer) => {
    setBusy(true);
    setError(null);
    try {
      await actions.upload(target, bytes, photo);
      setPending(null);
    } catch (e) {
      setPending(bytes);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const choose = async (camera: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const bytes = await pickRoundPhoto(camera);
      if (bytes) await upload(bytes);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const menu = () =>
    Alert.alert(photo ? 'Replace photo' : 'Add photo', undefined, [
      { text: 'Take photo', onPress: () => void choose(true) },
      { text: 'Choose from library', onPress: () => void choose(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const remove = () =>
    Alert.alert('Remove this photo?', 'The scores and round will stay unchanged.', [
      { text: 'Keep photo', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await actions.remove(photo!);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  return (
    <View style={s.slot}>
      <Text style={s.title}>{title}</Text>
      {photo ? (
        <PhotoImage photo={photo} />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={busy || !editable}
          onPress={menu}
          style={s.add}
        >
          <CameraMark />
          <Text style={s.text}>Add {target.kind === 'group' ? 'group ' : ''}photo</Text>
        </Pressable>
      )}
      {busy ? (
        <View style={s.row}>
          <ActivityIndicator color={palette.brass} />
          <Text style={s.small}>Preparing & uploading…</Text>
        </View>
      ) : editable && photo ? (
        <View style={s.row}>
          <Pressable accessibilityRole="button" onPress={menu} style={s.action}>
            <Text style={s.small}>Replace photo</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={remove} style={s.action}>
            <Text style={s.small}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
      {error && (
        <View>
          <Text accessibilityRole="alert" style={[s.small, { color: palette.clay }]}>
            {error}
          </Text>
          {pending && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void upload(pending)}
              style={s.action}
            >
              <Text style={s.text}>Retry upload</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
export function AcePhotoPrompt({
  roundId,
  playerId,
  hole,
}: {
  roundId: string;
  playerId: string;
  hole: number;
}) {
  const photos = useRoundPhotos(roundId);
  const [skipped, setSkipped] = useState(false);
  const { session } = useSession();
  const photo = photos.data?.find(
    (p) => p.kind === 'ace' && p.player_id === playerId && p.hole_number === hole,
  );
  if (skipped || photos.isPending || photos.isError) return null;
  return (
    <View style={{ marginTop: 20, borderTopWidth: 1, borderColor: palette.brass, paddingTop: 8 }}>
      <PhotoSlot
        target={{ roundId, kind: 'ace', playerId, hole }}
        {...(photo ? { photo } : {})}
        title={`Hole in one · ${hole}`}
        editable={!photo || photo.uploader_id === session?.user.id}
      />
      {!photo && (
        <Pressable accessibilityRole="button" onPress={() => setSkipped(true)} style={s.action}>
          <Text style={s.small}>Not now</Text>
        </Pressable>
      )}
    </View>
  );
}
export function RoundPhotoSection({
  roundId,
  aces,
  groupFinished = false,
  canEdit = false,
}: {
  roundId: string;
  aces: { playerId: string; hole: number; name?: string }[];
  groupFinished?: boolean;
  canEdit?: boolean;
}) {
  const photos = useRoundPhotos(roundId);
  const { session } = useSession();
  if (photos.isPending) return null;
  if (photos.isError)
    return (
      <Pressable accessibilityRole="button" onPress={() => void photos.refetch()} style={s.action}>
        <Text style={s.small}>Photos unavailable · Retry</Text>
      </Pressable>
    );
  const groupPhoto = photos.data.find((p) => p.kind === 'group');
  return (
    <View>
      {aces.map((ace) => {
        const photo = photos.data.find(
          (p) => p.kind === 'ace' && p.player_id === ace.playerId && p.hole_number === ace.hole,
        );
        if (!photo && !canEdit) return null;
        return (
          <PhotoSlot
            key={`${ace.playerId}:${ace.hole}`}
            target={{ roundId, kind: 'ace', playerId: ace.playerId, hole: ace.hole }}
            {...(photo ? { photo } : {})}
            title={`${ace.name ? ace.name + ' · ' : ''}Hole in one · ${ace.hole}`}
            editable={canEdit && (!photo || photo.uploader_id === session?.user.id)}
          />
        );
      })}
      {groupFinished && (groupPhoto || canEdit) && (
        <PhotoSlot
          target={{ roundId, kind: 'group' }}
          {...(groupPhoto ? { photo: groupPhoto } : {})}
          title="The group shot"
          editable={canEdit && (!groupPhoto || groupPhoto.uploader_id === session?.user.id)}
        />
      )}
    </View>
  );
}
export function RoundPhotoStrip({ roundId }: { roundId: string }) {
  const photos = useRoundPhotos(roundId);
  if (!photos.data?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {photos.data.map((p) => (
        <View key={p.id} style={{ width: 270 }}>
          <PhotoImage photo={p} />
          <Text style={[s.small, { marginTop: 8 }]}>{label(p)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
export function ProfilePhotos({
  userId,
  light = true,
}: {
  userId: string | undefined;
  light?: boolean;
}) {
  const photos = useProfilePhotos(userId);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const expanded = !!userId && expandedFor === userId;
  const fg = light ? palette.ink : palette.bone;
  const secondary = light ? palette.fairway : palette.sage;
  if (!photos.data?.length) return null;
  const visible = expanded ? photos.data : photos.data.slice(0, 1);
  return (
    <View style={{ marginTop: 28 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: fg }}>Highlights</Text>
        {photos.data.length > 1 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Show fewer highlights' : `Show ${photos.data.length - 1} more highlights`
            }
            accessibilityState={{ expanded }}
            onPress={() => setExpandedFor(expanded ? null : (userId ?? null))}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 4,
              opacity: pressed ? 0.55 : 1,
            })}
          >
            <Text style={{ fontSize: 13, color: secondary }}>
              {expanded ? 'Show less −' : `Show more +${photos.data.length - 1}`}
            </Text>
          </Pressable>
        )}
      </View>
      {visible.map((p) => {
        const title = p.kind === 'ace' ? 'Hole in one' : 'Group round';
        const course = p.round?.courses?.name ?? 'Course unavailable';
        const location = [p.round?.courses?.city, p.round?.courses?.state]
          .filter(Boolean)
          .join(', ');
        const date = p.round?.played_at
          ? format(parseLocalDate(p.round.played_at), 'MMM d, yyyy')
          : null;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={[
              title,
              p.kind === 'ace' ? `Hole ${p.hole_number}` : '',
              course,
              location,
              date,
              'Open round',
            ]
              .filter(Boolean)
              .join(', ')}
            onPress={() => router.push({ pathname: '/round/[id]', params: { id: p.round_id } })}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 16,
              alignItems: 'center',
              paddingVertical: 16,
              borderBottomWidth: 0.5,
              borderColor: fg + '25',
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{ width: 84 }}
            >
              <PhotoImage photo={p} thumbnail />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 21, color: fg }}>
                {title}
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, color: fg }}>
                {course}
              </Text>
              {!!location && (
                <Text numberOfLines={1} style={{ fontSize: 12, color: secondary }}>
                  {location}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  columnGap: 9,
                  rowGap: 4,
                  marginTop: 2,
                }}
              >
                {p.kind === 'ace' && (
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: secondary }}>
                    HOLE {String(p.hole_number).padStart(2, '0')}
                  </Text>
                )}
                {p.kind === 'ace' && date && (
                  <View
                    style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: palette.brass }}
                  />
                )}
                {date && (
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: secondary }}>
                    {date.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
const s = StyleSheet.create({
  slot: { marginVertical: 16, gap: 12 },
  title: { fontFamily: fontFamily.display, fontSize: 26, color: palette.bone },
  text: { fontSize: 17, color: palette.bone },
  small: { fontSize: 14, color: palette.sage, lineHeight: 20 },
  add: {
    minHeight: 72,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.brass,
    borderRadius: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  action: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 },
  close: { alignSelf: 'flex-end', padding: 20, minHeight: 44 },
});

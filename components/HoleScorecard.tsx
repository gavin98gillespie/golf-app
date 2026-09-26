import { Pressable, Text, View } from 'react-native';
import { Datum } from '@/components/Datum';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { palette, fontFamily, deltaLabel } from '@/theme/linksman';

/** Shared solo/group scoring face. Persistence stays with each player’s draft. */
export function HoleScorecard({
  hole,
  par,
  score,
  yardage,
  editablePar,
  telemetry,
  onPar,
  onScore,
}: {
  hole: number;
  par: number;
  score: number;
  yardage?: number | null | undefined;
  editablePar: boolean;
  telemetry: { thru: number; totalScore: number; vsPar: string; projected: number };
  onPar: (par: number) => void;
  onScore: (score: number) => void;
}) {
  const padded = String(hole).padStart(2, '0');
  const delta = score - par;
  const deltaTextColor = delta < 0 ? palette.sage : delta > 1 ? palette.clay : palette.bone + '99';
  return (
    <>
      {/* Hole metadata */}
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 11 * 0.18,
          color: palette.bone,
          opacity: 0.7,
          textTransform: 'uppercase',
          marginTop: 24,
        }}
      >
        HOLE {padded}
        {yardage ? ` · ${yardage} Y` : ''}
      </Text>

      {/* PAR hero */}
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 80,
          letterSpacing: -80 * 0.04,
          color: palette.bone,
          marginTop: 4,
          lineHeight: 80 * 0.95,
        }}
      >
        PAR {par}
      </Text>

      {/* Par picker when course hole missing */}
      {editablePar ? (
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {[3, 4, 5].map((p) => {
            const active = par === p;
            return (
              <Pressable
                key={p}
                onPress={() => onPar(p)}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderWidth: active ? 1 : 0.5,
                  borderColor: active ? palette.bone : palette.bone + '40',
                  borderRadius: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.mono,
                    fontSize: 11,
                    letterSpacing: 11 * 0.16,
                    color: palette.bone,
                    textTransform: 'uppercase',
                  }}
                >
                  PAR {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Telemetry strip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 28,
        }}
      >
        <Datum label="THRU" value={telemetry.thru} color={palette.bone} />
        <Datum label="STROKES" value={telemetry.totalScore} color={palette.bone} />
        <Datum label="VS PAR" value={telemetry.vsPar} color={palette.bone} />
        <Datum label="PROJ" value={telemetry.projected} color={palette.bone} align="right" />
      </View>

      {/* Score stepper */}
      <View style={{ marginTop: 48, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: palette.bone,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          STROKES THIS HOLE
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginTop: 18,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Subtract one stroke"
            onPress={() => onScore(Math.max(1, score - 1))}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 0.5,
              borderColor: palette.bone + '40',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>
              −
            </Text>
          </Pressable>
          <View style={{ minWidth: 112, alignItems: 'center' }}>
            <ScoreNumeral value={score} size={120} color={palette.bone} stack />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add one stroke"
            onPress={() => onScore(Math.min(20, score + 1))}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              borderWidth: 0.5,
              borderColor: palette.bone + '40',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>
              +
            </Text>
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 11,
            letterSpacing: 11 * 0.18,
            color: deltaTextColor,
            marginTop: 12,
            textTransform: 'uppercase',
          }}
        >
          {deltaLabel(delta, par, score)}
        </Text>
      </View>
    </>
  );
}

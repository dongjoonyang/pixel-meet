import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** 크레덴셜이 없으면 Supabase 없이도 앱이 그냥 로컬 모드로 도는 게 맞다 (소켓 서버와 같은 폴백 철학) */
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

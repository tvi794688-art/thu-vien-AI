import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALID_READER_TYPES = [
  "student",
  "teacher",
  "staff",
  "guest",
] as const;

type ReaderType = (typeof VALID_READER_TYPES)[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(
        { error: "Phương thức không được hỗ trợ." },
        405,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Thiếu cấu hình Supabase trên máy chủ." },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Bạn chưa đăng nhập." },
        401,
      );
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    // Client dùng token của người đang đăng nhập.
    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "Phiên đăng nhập không hợp lệ." },
        401,
      );
    }

    // Service-role client chỉ tồn tại trong Edge Function.
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Không tin role gửi từ frontend.
    // Luôn đọc role thật từ database.
    const { data: callerProfile, error: callerError } =
      await adminClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (callerError || !callerProfile) {
      return jsonResponse(
        { error: "Không tìm thấy hồ sơ người dùng." },
        403,
      );
    }

    if (
      callerProfile.role !== "admin" &&
      callerProfile.role !== "librarian"
    ) {
      return jsonResponse(
        { error: "Bạn không có quyền tạo độc giả." },
        403,
      );
    }

    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    const fullName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : "";

    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : "";

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    const readerType = body.reader_type as ReaderType;

    if (!fullName) {
      return jsonResponse(
        { error: "Vui lòng nhập họ và tên." },
        400,
      );
    }

    if (!email) {
      return jsonResponse(
        { error: "Vui lòng nhập email." },
        400,
      );
    }

    if (password.length < 6) {
      return jsonResponse(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        400,
      );
    }

    if (!VALID_READER_TYPES.includes(readerType)) {
      return jsonResponse(
        { error: "Loại độc giả không hợp lệ." },
        400,
      );
    }

    // Chỉ tạo Reader.
    // role và card_status sẽ do handle_new_user() ở DB quyết định.
    const {
      data: created,
      error: createError,
    } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        reader_type: readerType,
      },
    });

    if (createError || !created.user) {
      return jsonResponse(
        {
          error:
            createError?.message ||
            "Không thể tạo tài khoản độc giả.",
        },
        400,
      );
    }

    // Trigger handle_new_user() đã tạo profile.
    // Cập nhật thêm thông tin tùy chọn.
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        phone: phone || null,
        address: address || null,
      })
      .eq("id", created.user.id);

    if (profileError) {
      // Nếu cập nhật profile lỗi thì dọn user vừa tạo.
      await adminClient.auth.admin.deleteUser(created.user.id);

      return jsonResponse(
        { error: "Không thể hoàn tất hồ sơ độc giả." },
        500,
      );
    }

    return jsonResponse(
      {
        success: true,
        user_id: created.user.id,
        message: "Tạo độc giả thành công.",
      },
      201,
    );
  } catch (error) {
    console.error(error);

    return jsonResponse(
      { error: "Đã xảy ra lỗi khi tạo độc giả." },
      500,
    );
  }
});

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
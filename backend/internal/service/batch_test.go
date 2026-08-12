package service

import (
	"testing"
	"time"
)

func TestIsPermanentError(t *testing.T) {
	// 永久错误：不可重试
	permanent := []string{
		"AI 生成失败: AI 服务认证失败，请检查 API Key",
		"AI 生成文章失败: AI 服务余额不足，请联系管理员",
		"AI 请求参数错误: invalid model",
	}
	for _, e := range permanent {
		if !isPermanentError(e) {
			t.Errorf("isPermanentError(%q) = false, want true (应判定为永久错误不重试)", e)
		}
	}

	// 瞬态错误：可重试（429/5xx/超时/网络/解析/空响应）
	transient := []string{
		"AI 生成失败: AI 服务请求被拒绝 (429): rate limit",
		"AI 生成文章失败: AI 服务暂时不可用，请稍后再试",
		"AI 生成失败: AI 服务连接超时，请检查网络或稍后重试",
		"AI 生成失败: AI 服务连接失败，请检查网络配置",
		"AI 生成文章失败: AI 返回数据格式异常，请重试",
		"AI 生成失败: AI 返回内容为空，请重试",
	}
	for _, e := range transient {
		if isPermanentError(e) {
			t.Errorf("isPermanentError(%q) = true, want false (应判定为瞬态错误可重试)", e)
		}
	}
}

func TestBackoffDuration(t *testing.T) {
	cases := []struct {
		retry int
		min   time.Duration
	}{
		{1, 2 * time.Second},
		{2, 5 * time.Second},
		{3, 5 * time.Second}, // 超过表则取默认
	}
	for _, c := range cases {
		got := backoffDuration(c.retry)
		if got < c.min {
			t.Errorf("backoffDuration(%d) = %v, want >= %v", c.retry, got, c.min)
		}
	}
}

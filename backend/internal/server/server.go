package server

import (
	"fmt"
	"time"

	"topoknow-backend/internal/config"
	"topoknow-backend/internal/handler"
	"topoknow-backend/internal/model"
	"topoknow-backend/internal/repository"
	"topoknow-backend/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type Server struct {
	config *config.Config
	router *gin.Engine
}

func New(cfg *config.Config) *Server {
	// Initialize database once
	db, err := repository.InitDB(cfg)
	if err != nil {
		panic("Failed to initialize database: " + err.Error())
	}

	// Auto migrate all models
	if err := db.AutoMigrate(
		&model.Tree{},
		&model.Node{},
		&model.Question{},
		&model.Article{},
		&model.Prompt{},
	); err != nil {
		panic("Failed to migrate tables: " + err.Error())
	}

	// Initialize repositories with shared DB instance
	treeRepo := repository.NewTreeRepository(db)
	nodeRepo := repository.NewNodeRepository(db)
	promptRepo := repository.NewPromptRepository(db)
	articleRepo := repository.NewArticleRepository(db)
	questionRepo := repository.NewQuestionRepository(db)

	// Initialize services
	aiFactory := service.NewAIClientFactory(&cfg.AI)
	aiService := service.NewAIService(aiFactory, cfg)
	promptSvc := service.NewPromptService(promptRepo, aiService)
	aiService.SetPromptService(promptSvc)
	nodeContextSvc := service.NewNodeContextService(nodeRepo)

	// Initialize handlers
	treeHandler := handler.NewTreeHandler(treeRepo, nodeRepo, aiService)
	nodeHandler := handler.NewNodeHandler(nodeRepo, treeRepo, aiService)
	aiHandler := handler.NewAIHandler(aiService, aiFactory)
	promptHandler := handler.NewPromptHandler(promptSvc)
	articleHandler := handler.NewArticleHandler(articleRepo, nodeRepo, aiService, nodeContextSvc)
	questionHandler := handler.NewQuestionHandler(questionRepo, nodeRepo, aiService, nodeContextSvc)

	// Initialize default prompts
	if err := promptSvc.InitDefaultPrompts(); err != nil {
		panic("Failed to initialize default prompts: " + err.Error())
	}

	// Validate all required prompts exist
	if err := promptSvc.ValidateRequiredPrompts(); err != nil {
		panic("Prompt validation failed: " + err.Error())
	}

	// Setup router
	router := setupRouter(cfg, treeHandler, nodeHandler, aiHandler, promptHandler, articleHandler, questionHandler)

	return &Server{
		config: cfg,
		router: router,
	}
}

func setupRouter(
	cfg *config.Config,
	treeHandler *handler.TreeHandler,
	nodeHandler *handler.NodeHandler,
	aiHandler *handler.AIHandler,
	promptHandler *handler.PromptHandler,
	articleHandler *handler.ArticleHandler,
	questionHandler *handler.QuestionHandler,
) *gin.Engine {
	if cfg.App.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("[%s] %s %s %d %s\n",
			param.TimeStamp.Format(time.RFC3339),
			param.Method,
			param.Path,
			param.StatusCode,
			param.Latency,
		)
	}))

	// CORS
	corsOrigins := cfg.App.CORSOrigins
	if len(corsOrigins) == 0 {
		corsOrigins = []string{"http://localhost:6010", "http://127.0.0.1:6010"}
	}
	router.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1
	v1 := router.Group("/api")
	{
		// Tree routes (public)
		trees := v1.Group("/trees")
		{
			trees.GET("", treeHandler.List)
			trees.POST("", treeHandler.Create)
			trees.GET("/:id", treeHandler.GetByID)
			trees.DELETE("/:id", treeHandler.Delete)
		}

		// Node routes (public)
		nodes := v1.Group("/nodes")
		{
			// 具体路径必须在 :id 之前注册，否则会被 :id 匹配
			nodes.GET("", nodeHandler.List)
			nodes.GET("/:id/children", nodeHandler.GetChildren)
			nodes.GET("/:id/article", articleHandler.GetByNodeID)
			nodes.POST("/:id/article", articleHandler.Create)
			nodes.DELETE("/:id/article", articleHandler.Delete)
			nodes.POST("/:id/article/regenerate", articleHandler.Regenerate)
			nodes.GET("/:id/questions", questionHandler.GetByNodeID)
			nodes.POST("/:id/questions", questionHandler.Create)
			nodes.POST("/:id/expand", nodeHandler.Expand)
			nodes.PATCH("/:id/expanded", nodeHandler.UpdateExpanded)
			nodes.DELETE("/:id/children", nodeHandler.DeleteChildren)

			// 通配路由 :id 放在最后
			nodes.GET("/:id", nodeHandler.GetByID)
			nodes.POST("", nodeHandler.Create)
			nodes.PUT("/:id", nodeHandler.Update)
			nodes.DELETE("/:id", nodeHandler.Delete)
		}

		// Question routes
		questions := v1.Group("/questions")
		{
			questions.GET("", questionHandler.List)
			questions.DELETE("/:id", questionHandler.Delete)
		}

		// Article routes
		articles := v1.Group("/articles")
		{
			articles.GET("", articleHandler.List)
			articles.DELETE("/:id", articleHandler.DeleteByID)
		}

		// AI routes (public)
		ai := v1.Group("/ai")
		{
			ai.GET("/models", aiHandler.GetModels)
			ai.POST("/generate-path", aiHandler.GeneratePath)
			ai.POST("/generate-quiz", aiHandler.GenerateQuiz)
			ai.POST("/explain-node", aiHandler.ExplainNode)
		}

		// Prompt routes (public)
		prompts := v1.Group("/prompts")
		{
			prompts.GET("", promptHandler.List)
			prompts.GET("/init", promptHandler.InitDefaults)
			prompts.GET("/:id", promptHandler.GetByID)
			prompts.GET("/name/:name", promptHandler.GetByName)
			prompts.GET("/category/:category", promptHandler.GetByCategory)
			prompts.POST("", promptHandler.Create)
			prompts.PUT("/:id", promptHandler.Update)
			prompts.DELETE("/:id", promptHandler.Delete)
			prompts.POST("/render", promptHandler.Render)
			prompts.POST("/generate", promptHandler.Generate)
			prompts.POST("/:id/optimize", promptHandler.Optimize)
		}
	}

	return router
}

func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%d", s.config.App.Host, s.config.App.Port)
	return s.router.Run(addr)
}

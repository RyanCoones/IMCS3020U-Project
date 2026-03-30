#A limitation of the hold-out validation set approach to training a stacking model 
# is that level 0 and level 1 models are not trained on the full dataset.


# load models from file
def load_all_models(n_models):
	all_models = list()
    # load each model and add to list.  due to the small amount of models, we can just hard code the filenames.  
	
	all_models.append()
	print('>loaded %s' % 
	return all_models

# load all models
n_members = 5
members = load_all_models(n_members)
print('Loaded %d models' % len(members))

# need a way to reference the test set.  which means I need knowledge of how the output of the level 0 models is stored, and in what format.  
# 